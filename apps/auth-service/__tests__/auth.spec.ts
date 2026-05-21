import { AuthService } from '../src/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { verifyJwt } from '@ipam/shared-auth';

const BCRYPT_HASH = bcrypt.hashSync('admin123', 10);

const mockUser = {
  id: '00000000-0000-0000-0000-000000000010',
  email: 'admin@ipam.local',
  password_hash: BCRYPT_HASH,
  status: 'ACTIVE',
};

const mockRoles = [{ name: 'ADMIN' }];

const mockDataSource = {
  query: jest.fn(),
};

// Use the same dev secret the service falls back to when JWT_SECRET is unset
const DEV_SECRET = 'ipam-dev-secret-change-in-production';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(mockDataSource as any);
    mockDataSource.query.mockReset();
    delete process.env.JWT_SECRET;
  });

  describe('login', () => {
    it('rejects wrong password', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce(mockRoles);
      await expect(service.login('admin@ipam.local', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('accepts correct password and returns a valid JWT', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([mockUser])
        .mockResolvedValueOnce(mockRoles);
      const result = await service.login('admin@ipam.local', 'admin123');
      expect(result.accessToken).toBeTruthy();
      expect(result.userId).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.roles).toContain('ADMIN');

      const decoded = verifyJwt(result.accessToken, DEV_SECRET);
      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.roles).toContain('ADMIN');
    });

    it('rejects unknown email', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);
      await expect(service.login('unknown@example.com', 'admin123')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('hashPassword', () => {
    it('produces a bcrypt hash that verifies', async () => {
      const hash = await service.hashPassword('mypassword');
      const match = await bcrypt.compare('mypassword', hash);
      expect(match).toBe(true);
    });
  });
});
