// In-memory waitlist storage to replace Supabase
class WaitlistService {
  private emails: Set<string> = new Set();
  private count: number = 0;

  constructor() {
    // Initialize with a base count to maintain the UI display
    this.count = 1216;
  }

  async getCount(): Promise<{ count: number }> {
    return { count: this.count };
  }

  async addEmail(email: string): Promise<{ error?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    
    if (this.emails.has(normalizedEmail)) {
      return { error: "This email is already on the waitlist" };
    }

    this.emails.add(normalizedEmail);
    this.count++;
    
    return {};
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.emails.has(normalizedEmail);
  }
}

// Export a singleton instance
export const waitlistService = new WaitlistService();
