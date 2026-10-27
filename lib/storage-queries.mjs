export const QUERIES={
 owner_get:"SELECT value FROM marketing_system WHERE key = 'owner'",
 member_get:'SELECT role FROM marketing_members WHERE email = ?',
 records_admin:'SELECT * FROM marketing_records ORDER BY updated_at DESC LIMIT 2000',
 records_requester:"SELECT * FROM marketing_records WHERE (kind = 'request' AND owner = ?) OR kind = 'settings' ORDER BY updated_at DESC LIMIT 500",
 records_reader:"SELECT * FROM marketing_records WHERE kind IN ('content','event','resource') ORDER BY updated_at DESC LIMIT 1000",
 members_list:'SELECT email, role FROM marketing_members ORDER BY email LIMIT 200',
 owner_init:"INSERT OR IGNORE INTO marketing_system (key,value) VALUES ('owner',?)",
 member_upsert:'INSERT INTO marketing_members (email,role) VALUES (?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role',
 member_delete:'DELETE FROM marketing_members WHERE email = ?',
 record_get:'SELECT * FROM marketing_records WHERE id=?',
 record_delete:'DELETE FROM marketing_records WHERE id=?',
 record_update:'UPDATE marketing_records SET payload=?,updated_at=? WHERE id=? AND updated_at=?',
 record_insert:'INSERT INTO marketing_records (id,kind,payload,owner,created_at,updated_at) VALUES (?,?,?,?,?,?)'
};
const guard="NOT EXISTS (SELECT 1 FROM marketing_system WHERE key='supabase_state' AND value IN ('copying','active'))";
export const GUARDED_WRITES={
 owner_init:`INSERT OR IGNORE INTO marketing_system (key,value) SELECT 'owner',? WHERE ${guard}`,
 member_upsert:`INSERT INTO marketing_members (email,role) SELECT ?,? WHERE ${guard} ON CONFLICT(email) DO UPDATE SET role=excluded.role`,
 member_delete:QUERIES.member_delete+` AND ${guard}`,
 record_delete:QUERIES.record_delete+` AND ${guard}`,
 record_update:QUERIES.record_update+` AND ${guard}`,
 record_insert:`INSERT INTO marketing_records (id,kind,payload,owner,created_at,updated_at) SELECT ?,?,?,?,?,? WHERE ${guard}`
};
export const STATE_QUERY="SELECT value FROM marketing_system WHERE key='supabase_state'";
