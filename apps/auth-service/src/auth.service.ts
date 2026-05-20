import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(private dataSource: DataSource) {}
  
  async getHealth() {
    try {
       await this.dataSource.query('SELECT 1');
       return { status: 'UP', service: 'auth-service' };
    } catch(e) {
       return { status: 'DOWN', error: e.message };
    }
  }

  async login(email: string, passwordHash: string) {
    // For Phase 1 we match plain hash/password exactly as provided in the initialization seed
    const users = await this.dataSource.query(
      'SELECT * FROM users WHERE email = $1 AND password_hash = $2', 
      [email, passwordHash]
    );
    
    if (!users.length) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const user = users[0];
    const roles = await this.dataSource.query(
      `SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1`, 
      [user.id]
    );
    
    return {
      userId: user.id,
      email: user.email,
      roles: roles.map(r => r.name),
      token: Buffer.from(`\${user.email}:\${user.id}`).toString('base64')
    };
  }

  async getUsers() {
    return this.dataSource.query(`SELECT id, email, status, created_at FROM users`);
  }
}
