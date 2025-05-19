export interface NotesInterface {
  note_id?: string; 
  title: string;
  description: string;
  status: string; 
  userId: number | string;
  user_id: string;
  username: string;
  picture?: string | null;  
}