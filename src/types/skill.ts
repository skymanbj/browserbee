export interface UserSkill {
  id: string;        // Unique identifier for the custom skill
  name: string;      // Human-readable short name for the skill (e.g. 📝 页面总结)
  prompt: string;    // The actual prompt instruction template
  createdAt: number; // Timestamp
}
