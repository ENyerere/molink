"""
Sealos 数据库初始化脚本
用 Python + pymysql 执行 init-db.sql，无需安装 mysql 命令行客户端
"""
import pymysql
import pymysql.constants

def import_sql():
    # Sealos 数据库连接信息（根据你的实际信息修改）
    config = {
        "host": "dbconn.sealoshzh.site",
        "port": 37324,
        "user": "root",
        "password": "***REMOVED***",
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

    # 2. 切换到 molink_db，执行建表和插入数据
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

            # 检查默认管理员
            cursor.execute("SELECT email, full_name FROM users WHERE email='admin@molink.local';")
            admin = cursor.fetchone()
            if admin:
                print(f"\n👤 默认管理员: {admin[0]} ({admin[1]})")

    finally:
        conn.close()

    print("\n🎉 数据库初始化完成！")

if __name__ == "__main__":
    import_sql()
