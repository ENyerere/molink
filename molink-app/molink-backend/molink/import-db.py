"""
Sealos 数据库初始化脚本
用 Python + pymysql 执行 init-db.sql，无需安装 mysql 命令行客户端

连接信息从环境变量读取（切勿把密码写进代码）：
    DB_HOST       必填，数据库主机
    DB_PORT       可选，默认 3306
    DB_USER       可选，默认 root
    DB_PASSWORD   必填，数据库密码
"""
import os

import pymysql
import pymysql.constants


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"错误：请先设置环境变量 {name}")
    return value


def import_sql():
    # 数据库连接信息全部来自环境变量
    config = {
        "host": _require_env("DB_HOST"),
        "port": int(os.environ.get("DB_PORT", "3306")),
        "user": os.environ.get("DB_USER", "root"),
        "password": _require_env("DB_PASSWORD"),
        "charset": "utf8mb4",
        "client_flag": pymysql.constants.CLIENT.MULTI_STATEMENTS,
    }

    # 1. 先连接 MySQL（不指定数据库），执行 CREATE DATABASE
    conn = pymysql.connect(**config)
    try:
        with conn.cursor() as cursor:
            cursor.execute("CREATE DATABASE IF NOT EXISTS molink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            print("✅ 数据库 molink_db 已创建或已存在")
        conn.commit()
    finally:
        conn.close()

    # 2. 切换到 molink_db，执行建表
    config["database"] = "molink_db"
    conn = pymysql.connect(**config)
    try:
        with conn.cursor() as cursor:
            with open("init-db.sql", "r", encoding="utf-8") as f:
                sql = f.read()
            cursor.execute(sql)
            print("✅ init-db.sql 执行成功")
        conn.commit()

        # 验证表是否创建成功
        with conn.cursor() as cursor:
            cursor.execute("SHOW TABLES;")
            tables = cursor.fetchall()
            print(f"\n📋 共创建 {len(tables)} 张表:")
            for t in tables:
                print(f"  - {t[0]}")

    finally:
        conn.close()

    print("\n🎉 数据库初始化完成！")
    print("提示：默认管理员由后端启动时播种，请设置 ADMIN_PASSWORD 环境变量后启动后端。")

if __name__ == "__main__":
    import_sql()
