export interface NotesInterface {
  note_id?: string; // อาจไม่จำเป็นต้องส่งหาก backend สร้างให้
  title: string;
  description: string;
  status: string; // เช่น "active", "pending", etc.
  userId: number | string;
  username: string;
}