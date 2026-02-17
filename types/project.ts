export interface Project {
  id: string;
  name: string;
  customPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}
