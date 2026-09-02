import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateClientDto } from './dto/create-customer.dto.js';
import { UpdateClientDto } from './dto/update-customer.dto.js';
import { CreateClientContactDto, UpdateClientContactDto } from './dto/client-contact.dto.js';
import { ClientsPaginationDto } from './dto/customers-pagination.dto.js';
import {
  getSkipAndTake,
  createPaginationResult,
  PaginatedResult,
} from '../common/helpers/pagination.helper.js';
import { Prisma, ClientType, ProjectStatus } from '../../generated/prisma/client.js';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async create(createClientDto: CreateClientDto, userId: number) {
    const name = createClientDto.name.trim();
    const clientType = createClientDto.clientType || ClientType.OTHER;
    const email = createClientDto.email?.trim().toLowerCase() || null;
    const phone = createClientDto.phone?.trim() || null;
    const address = createClientDto.address?.trim() || null;

    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          name,
          clientType,
          email,
          phone,
          address,
          isActive: true,
        },
      });

      if (createClientDto.primaryContact?.name?.trim()) {
        const contactName = createClientDto.primaryContact.name.trim();
        const contactEmail = createClientDto.primaryContact.email?.trim().toLowerCase() || null;
        const contactPhone = createClientDto.primaryContact.phone?.trim() || null;

        await tx.clientContact.create({
          data: {
            clientId: client.id,
            name: contactName,
            email: contactEmail,
            phone: contactPhone,
            isActive: true,
          },
        });
      }

      await this.auditLogs.logAction(userId, 'CREATE', 'clients', client.id, {
        newValues: { name, clientType, email, phone, address, isActive: true },
      });

      return client;
    });
  }

  async findAll(
    paginationDto: ClientsPaginationDto,
  ): Promise<PaginatedResult<any>> {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const search = paginationDto.search;
    const status = paginationDto.status;
    const clientType = paginationDto.clientType;
    const { skip, take } = getSkipAndTake(page, limit);

    const whereClause: Prisma.ClientWhereInput = {};

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    if (clientType && clientType !== 'all') {
      if (clientType === 'PHM') whereClause.clientType = ClientType.PHM;
      if (clientType === 'OTHER') whereClause.clientType = ClientType.OTHER;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        {
          contacts: {
            some: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where: whereClause,
        skip,
        take,
        include: {
          contacts: {
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: {
              projects: true,
              contacts: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.client.count({
        where: whereClause,
      }),
    ]);

    return createPaginationResult(data, total, page, limit);
  }

  async findOne(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        contacts: {
          orderBy: { createdAt: 'asc' },
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            referenceNumber: true,
            location: true,
          },
        },
      },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }
    return client;
  }

  async update(
    id: number,
    updateClientDto: UpdateClientDto,
    userId: number,
  ) {
    const client = await this.findOne(id);

    const name = updateClientDto.name?.trim();
    const clientType = updateClientDto.clientType;
    const email =
      updateClientDto.email !== undefined
        ? updateClientDto.email?.trim().toLowerCase() || null
        : undefined;
    const phone =
      updateClientDto.phone !== undefined
        ? updateClientDto.phone?.trim() || null
        : undefined;
    const address =
      updateClientDto.address !== undefined
        ? updateClientDto.address?.trim() || null
        : undefined;

    const updatedClient = await this.prisma.client.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(clientType !== undefined && { clientType }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
      },
      include: {
        contacts: true,
      },
    });

    await this.auditLogs.logAction(userId, 'UPDATE', 'clients', id, {
      oldValues: {
        name: client.name,
        clientType: client.clientType,
        email: client.email,
        phone: client.phone,
        address: client.address,
      },
      newValues: {
        name: updatedClient.name,
        clientType: updatedClient.clientType,
        email: updatedClient.email,
        phone: updatedClient.phone,
        address: updatedClient.address,
      },
    });

    return updatedClient;
  }

  async deactivate(id: number, userId: number) {
    const client = await this.findOne(id);

    // Rule 6: If Client has ACTIVE Projects, BLOCK deactivation
    const activeProjectsCount = await this.prisma.project.count({
      where: {
        clientId: id,
        status: ProjectStatus.ACTIVE,
      },
    });

    if (activeProjectsCount > 0) {
      throw new BadRequestException(
        `Cannot deactivate client "${client.name}". This client currently has ${activeProjectsCount} active project(s). Please complete or reassign active projects first.`,
      );
    }

    const updatedClient = await this.prisma.client.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogs.logAction(userId, 'DEACTIVATE', 'clients', id, {
      oldValues: { isActive: client.isActive },
      newValues: { isActive: false },
    });

    return updatedClient;
  }

  async reactivate(id: number, userId: number) {
    const client = await this.findOne(id);

    const updatedClient = await this.prisma.client.update({
      where: { id },
      data: { isActive: true },
    });

    await this.auditLogs.logAction(userId, 'REACTIVATE', 'clients', id, {
      oldValues: { isActive: client.isActive },
      newValues: { isActive: true },
    });

    return updatedClient;
  }

  async delete(id: number, userId: number) {
    const client = await this.findOne(id);

    // Check if referenced by projects or delivery orders
    const [projectCount, doCount] = await Promise.all([
      this.prisma.project.count({ where: { clientId: id } }),
      this.prisma.deliveryOrder.count({ where: { clientId: id } }),
    ]);

    if (projectCount > 0 || doCount > 0) {
      throw new BadRequestException(
        `Cannot delete client "${client.name}" because it is referenced in projects or delivery orders. You may deactivate it instead.`,
      );
    }

    await this.prisma.client.delete({ where: { id } });

    await this.auditLogs.logAction(userId, 'DELETE', 'clients', id, {
      oldValues: {
        name: client.name,
        clientType: client.clientType,
        email: client.email,
        phone: client.phone,
        address: client.address,
      },
    });

    return { message: `Client "${client.name}" deleted successfully.` };
  }

  // =================== CLIENT CONTACTS ===================

  async findContacts(clientId: number, status?: string) {
    await this.findOne(clientId);
    const where: Prisma.ClientContactWhereInput = { clientId };
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    return this.prisma.clientContact.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async addContact(clientId: number, dto: CreateClientContactDto, userId: number) {
    await this.findOne(clientId);
    const name = dto.name.trim();
    const email = dto.email?.trim().toLowerCase() || null;
    const phone = dto.phone?.trim() || null;

    const contact = await this.prisma.clientContact.create({
      data: {
        clientId,
        name,
        email,
        phone,
        isActive: true,
      },
    });

    await this.auditLogs.logAction(userId, 'CREATE', 'client_contacts', contact.id, {
      newValues: { clientId, name, email, phone, isActive: true },
    });

    return contact;
  }

  async updateContact(
    clientId: number,
    contactId: number,
    dto: UpdateClientContactDto,
    userId: number,
  ) {
    const contact = await this.prisma.clientContact.findFirst({
      where: { id: contactId, clientId },
    });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found for this client`);
    }

    const name = dto.name?.trim();
    const email = dto.email !== undefined ? dto.email?.trim().toLowerCase() || null : undefined;
    const phone = dto.phone !== undefined ? dto.phone?.trim() || null : undefined;

    const updated = await this.prisma.clientContact.update({
      where: { id: contactId },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
      },
    });

    await this.auditLogs.logAction(userId, 'UPDATE', 'client_contacts', contactId, {
      oldValues: { name: contact.name, email: contact.email, phone: contact.phone },
      newValues: { name: updated.name, email: updated.email, phone: updated.phone },
    });

    return updated;
  }

  async deactivateContact(clientId: number, contactId: number, userId: number) {
    const contact = await this.prisma.clientContact.findFirst({
      where: { id: contactId, clientId },
    });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found for this client`);
    }

    const updated = await this.prisma.clientContact.update({
      where: { id: contactId },
      data: { isActive: false },
    });

    await this.auditLogs.logAction(userId, 'DEACTIVATE', 'client_contacts', contactId, {
      oldValues: { isActive: true },
      newValues: { isActive: false },
    });

    return updated;
  }

  async reactivateContact(clientId: number, contactId: number, userId: number) {
    const contact = await this.prisma.clientContact.findFirst({
      where: { id: contactId, clientId },
    });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found for this client`);
    }

    const updated = await this.prisma.clientContact.update({
      where: { id: contactId },
      data: { isActive: true },
    });

    await this.auditLogs.logAction(userId, 'REACTIVATE', 'client_contacts', contactId, {
      oldValues: { isActive: false },
      newValues: { isActive: true },
    });

    return updated;
  }

  async deleteContact(clientId: number, contactId: number, userId: number) {
    const contact = await this.prisma.clientContact.findFirst({
      where: { id: contactId, clientId },
    });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found for this client`);
    }

    const projectRefCount = await this.prisma.project.count({
      where: { clientContactId: contactId },
    });

    if (projectRefCount > 0) {
      throw new BadRequestException(
        `Cannot delete contact "${contact.name}" because they are selected in ${projectRefCount} project(s). You may deactivate this contact instead.`,
      );
    }

    await this.prisma.clientContact.delete({ where: { id: contactId } });

    await this.auditLogs.logAction(userId, 'DELETE', 'client_contacts', contactId, {
      oldValues: { name: contact.name, email: contact.email, phone: contact.phone },
    });

    return { message: `Contact "${contact.name}" deleted successfully.` };
  }
}
