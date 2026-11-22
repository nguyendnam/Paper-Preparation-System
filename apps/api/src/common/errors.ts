import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export class ValidationFailed extends BadRequestException {
  constructor(message: string) {
    super({ code: 'VALIDATION_FAILED', message });
  }
}

export class AuthRequired extends UnauthorizedException {
  constructor(message = 'Bạn cần đăng nhập để tiếp tục.') {
    super({ code: 'AUTH_REQUIRED', message });
  }
}

export class AccessDenied extends ForbiddenException {
  constructor(message = 'Bạn không có quyền thực hiện thao tác này.') {
    super({ code: 'ACCESS_DENIED', message });
  }
}

export class NotFound extends NotFoundException {
  constructor(message = 'Không tìm thấy dữ liệu.') {
    super({ code: 'NOT_FOUND', message });
  }
}

export class TargetArchived extends ConflictException {
  constructor() {
    super({
      code: 'TARGET_ARCHIVED',
      message:
        'Submission Target đã được lưu trữ (ARCHIVED) và chỉ có thể xem, không thể chỉnh sửa.',
    });
  }
}

export class Conflict extends ConflictException {
  constructor(code: string, message: string) {
    super({ code, message });
  }
}
