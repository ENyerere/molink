"""
自动数据库迁移模块

功能：
- 自动对比 SQLAlchemy 模型与数据库实际表结构
- 自动添加缺失的列（不删除已有数据）
- 自动创建缺失的表
- 打印详细迁移日志

使用方式：
    在 main.py 的 lifespan 中调用 auto_migrate()

注意事项：
- 不会删除已有列（保护数据）
- 不会修改已有列的类型（避免数据丢失）
- 外键约束需要手动处理
"""

from sqlalchemy import inspect, text
from sqlalchemy import String, Text, DateTime, Boolean, Integer, BigInteger, Float, Numeric
from sqlalchemy.dialects.mysql import CHAR, VARCHAR
from app.core.database import engine, Base


def _get_mysql_type(column):
    """将 SQLAlchemy 列类型转换为 MySQL DDL 类型字符串"""
    t = column.type

    # 处理包装类型（如 Enum 包装在 VARCHAR 中）
    if hasattr(t, 'impl'):
        t = t.impl

    if isinstance(t, (String, VARCHAR)):
        length = t.length or 255
        return f"VARCHAR({length})"
    elif isinstance(t, Text):
        return "TEXT"
    elif isinstance(t, DateTime):
        return "DATETIME"
    elif isinstance(t, Boolean):
        return "BOOLEAN"
    elif isinstance(t, Integer):
        return "INT"
    elif isinstance(t, BigInteger):
        return "BIGINT"
    elif isinstance(t, CHAR):
        length = t.length or 36
        return f"CHAR({length})"
    elif isinstance(t, Float):
        return "FLOAT"
    elif isinstance(t, Numeric):
        return f"DECIMAL({t.precision or 10},{t.scale or 2})"
    else:
        # 兜底：尝试用类名推断
        type_name = type(t).__name__.upper()
        if hasattr(t, 'length') and t.length:
            return f"{type_name}({t.length})"
        return type_name


def _build_column_sql(column):
    """构建 ADD COLUMN 的完整 SQL 片段"""
    mysql_type = _get_mysql_type(column)
    parts = [f"`{column.name}`", mysql_type]

    # 自增主键
    if getattr(column, 'autoincrement', False):
        parts.append("AUTO_INCREMENT")

    # NULL / NOT NULL
    if column.nullable:
        parts.append("NULL")
    else:
        parts.append("NOT NULL")

    # 默认值（Python 层面的默认值）
    if column.default is not None:
        arg = column.default.arg
        if not callable(arg):
            if isinstance(arg, str):
                parts.append(f"DEFAULT '{arg}'")
            elif isinstance(arg, bool):
                parts.append(f"DEFAULT {1 if arg else 0}")
            elif arg is None:
                pass  # NULL 默认值不需要显式声明
            else:
                parts.append(f"DEFAULT {arg}")

    # 数据库层面的默认值（server_default）
    elif column.server_default is not None:
        if hasattr(column.server_default, 'arg'):
            parts.append(f"DEFAULT {column.server_default.arg}")

    return " ".join(parts)


def auto_migrate():
    """
    自动迁移入口

    流程：
    1. 遍历所有 SQLAlchemy 模型表
    2. 如果表不存在，跳过（留给 create_all 处理）
    3. 如果表存在，对比模型列和实际列
    4. 自动添加缺失的列
    """
    print("=" * 60)
    print("[MIGRATION] Starting auto-migration...")
    print("=" * 60)

    inspector = inspect(engine)
    total_changes = 0
    total_tables = 0

    for table_name, table in Base.metadata.tables.items():
        total_tables += 1
        try:
            # 检查表是否存在
            if not inspector.has_table(table_name):
                print(f"[MIGRATION] Table '{table_name}' not found, will be created by create_all()")
                continue

            # 获取数据库中已有的列
            existing_columns = {col['name'] for col in inspector.get_columns(table_name)}
            model_columns = {col.name for col in table.columns}
            missing_columns = model_columns - existing_columns

            if missing_columns:
                print(f"[MIGRATION] Table '{table_name}': found {len(missing_columns)} missing column(s): {sorted(missing_columns)}")
            else:
                print(f"[MIGRATION] Table '{table_name}': OK ({len(existing_columns)} columns)")
                continue

            # 逐个添加缺失的列
            for column in table.columns:
                if column.name in existing_columns:
                    continue

                col_sql = _build_column_sql(column)

                # 安全策略：如果列不可为空且没有默认值，先添加为 NULL
                # 否则已有数据会导致 ALTER TABLE 失败
                safe_sql = col_sql
                if not column.nullable and column.default is None and column.server_default is None:
                    safe_sql = col_sql.replace("NOT NULL", "NULL")
                    print(f"[MIGRATION]   -> Column '{column.name}' is NOT NULL with no default,")
                    print(f"[MIGRATION]      temporarily adding as NULL to avoid conflict with existing data")

                sql = f"ALTER TABLE `{table_name}` ADD COLUMN {safe_sql}"

                with engine.connect() as conn:
                    conn.execute(text(sql))
                    conn.commit()

                print(f"[MIGRATION]   -> SUCCESS: Added '{column.name}' ({_get_mysql_type(column)})")
                total_changes += 1

        except Exception as e:
            print(f"[MIGRATION] ERROR processing table '{table_name}': {e}")

    print("=" * 60)
    if total_changes == 0:
        print(f"[MIGRATION] All {total_tables} table(s) are up to date. No changes needed.")
    else:
        print(f"[MIGRATION] Completed. Total columns added: {total_changes}")
    print("=" * 60)
