import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../lib/prisma/prisma.service';
import { PermissionCacheService } from './permission-cache.service';

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: PermissionCacheService,
  ) {}

  static hasRule(
    rules: string[] | undefined,
    resource: string,
    action: string,
  ): boolean {
    if (!rules) return false;
    for (const rule of rules) {
      const [r, a] = rule.split(':');
      if (r === '*' || r === resource) {
        if (a === '*' || a === action) return true;
      }
    }
    return false;
  }

  static hasAnyRule(rules: string[], required: string[]): boolean {
    for (const req of required) {
      const [resource, action] = req.split(':');
      if (this.hasRule(rules, resource, action)) return true;
    }
    return false;
  }

  static hasAllRules(rules: string[] | undefined, required: string[]): boolean {
    if (!rules) return false;
    for (const req of required) {
      const [resource, action] = req.split(':');
      if (!this.hasRule(rules, resource, action)) return false;
    }
    return true;
  }

  static normalizeRules(input: string[] | undefined): string[] {
    if (!input) return [];

    const hasGlobalWildcard = input.some((r) => r === '*:*');
    if (hasGlobalWildcard) return ['*:*'];

    const wildcardResources = new Set<string>();
    const explicit = new Map<string, Set<string>>();

    for (const rule of input) {
      const [resource, action] = rule.split(':');
      if (!resource) continue;
      if (!action) continue;

      if (action === '*') {
        wildcardResources.add(resource);
        explicit.delete(resource);
      } else if (!wildcardResources.has(resource)) {
        if (!explicit.has(resource)) {
          explicit.set(resource, new Set());
        }
        explicit.get(resource)!.add(action);
      }
    }

    const result: string[] = [];
    for (const resource of [...wildcardResources].sort()) {
      result.push(`${resource}:*`);
    }
    for (const [resource, actions] of [...explicit.entries()].sort()) {
      for (const action of [...actions].sort()) {
        result.push(`${resource}:${action}`);
      }
    }
    return result;
  }

  async getUserRules(userId: string): Promise<string[]> {
    const cached = await this.cache.get(userId);
    if (cached) return cached;

    const assignments = await this.prisma.roleAssignment.findMany({
      where: { userId },
      select: {
        role: {
          select: { rules: true },
        },
      },
    });

    const allRules: string[] = [];
    for (const assignment of assignments) {
      allRules.push(...assignment.role.rules);
    }

    const normalized = PermissionService.normalizeRules(allRules);
    await this.cache.set(userId, normalized);
    return normalized;
  }

  async invalidateCache(userId?: string): Promise<void> {
    await this.cache.invalidate(userId);
  }
}
