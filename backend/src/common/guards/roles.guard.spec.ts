import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (userRole?: string): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: userRole ? { id: 1, email: 'test@example.com', role: userRole } : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext('READ_ONLY');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow SUPER_ADMIN for SUPER_ADMIN-only endpoints', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);
    const context = createMockContext('SUPER_ADMIN');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should forbid ADMIN for SUPER_ADMIN-only endpoints', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);
    const context = createMockContext('ADMIN');
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should forbid READ_ONLY for SUPER_ADMIN-only endpoints', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);
    const context = createMockContext('READ_ONLY');
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow SUPER_ADMIN and ADMIN for operational endpoints', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN', 'ADMIN']);
    expect(guard.canActivate(createMockContext('SUPER_ADMIN'))).toBe(true);
    expect(guard.canActivate(createMockContext('ADMIN'))).toBe(true);
  });

  it('should forbid READ_ONLY for operational endpoints', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN', 'ADMIN']);
    expect(() => guard.canActivate(createMockContext('READ_ONLY'))).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user session is not attached', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);
    const context = createMockContext();
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
