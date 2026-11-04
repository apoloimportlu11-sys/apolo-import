import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getMysqlPool() {
  if (!pool) {
    if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE || !process.env.MYSQL_USER) {
      throw new Error("Faltan variables MYSQL_HOST / MYSQL_DATABASE / MYSQL_USER en el entorno");
    }

    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || "",
      waitForConnections: true,
      connectionLimit: 5,
    });
  }

  return pool;
}

export interface MysqlProductRow {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  short_description: string | null;
  description: string | null;
  presentation: string | null;
  viscosity: string | null;
  type: string | null;
  subcategory_id: string | null;
  subcategory: string | null;
  category_id: string | null;
  image_url: string | null;
  stock: number;
  is_featured: number | boolean;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
}
