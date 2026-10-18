import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const records = sqliteTable("marketing_records", {
 id: text("id").primaryKey(), kind: text("kind").notNull(),
 payload: text("payload").notNull(), owner: text("owner").notNull(),
 createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull()
});
export const members = sqliteTable("marketing_members", {
 email: text("email").primaryKey(), role: text("role").notNull(), userId: text("user_id")
});
export const system = sqliteTable("marketing_system", { key:text("key").primaryKey(), value:text("value").notNull() });
