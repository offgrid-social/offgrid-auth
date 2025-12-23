import { prisma } from '../db/prisma';

export type DeviceType = 'cli' | 'web' | 'mobile';

export class DeviceService {
  async upsertDevice(userId: string, type: DeviceType, name: string) {
    const existing = await prisma.device.findFirst({ where: { userId, type, name } });
    if (existing) {
      return prisma.device.update({ where: { id: existing.id }, data: { lastSeenAt: new Date(), name } });
    }

    return prisma.device.create({ data: { userId, type, name, lastSeenAt: new Date() } });
  }
}

export const deviceService = new DeviceService();
