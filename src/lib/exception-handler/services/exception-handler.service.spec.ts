import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from '../filter/global-exception.filter';
import { ExceptionHandlerService } from './exception-handler.service';

describe('ExceptionHandlerService', () => {
  let service: ExceptionHandlerService;

  beforeEach(() => {
    service = new ExceptionHandlerService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have default formatters registered', () => {
    const formatters = service.getAllFormatters();
    expect(formatters.length).toBeGreaterThan(0);
  });
});
