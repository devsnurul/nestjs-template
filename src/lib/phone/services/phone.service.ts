import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CountryCode,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';
import { NormalizedPhone } from '../interfaces/index';
import { env } from '../../../config/env/index';

const DEFAULT_COUNTRY = env.otp.defaultCountry as CountryCode;

@Injectable()
export class PhoneService {
  normalize(input: string, countryCode: CountryCode = DEFAULT_COUNTRY): string {
    return this.parse(input, countryCode).e164;
  }

  parse(
    input: string,
    countryCode: CountryCode = DEFAULT_COUNTRY,
  ): NormalizedPhone {
    const candidate = input?.trim();
    if (!candidate) {
      throw new BadRequestException('Invalid mobile number');
    }

    let phone = parsePhoneNumberFromString(candidate, countryCode);
    if (!phone?.isValid()) {
      const withoutPlus = candidate.startsWith('+')
        ? candidate
        : this.withoutInternationalPrefix(candidate);
      if (!withoutPlus.startsWith('+') || withoutPlus !== candidate) {
        phone = parsePhoneNumberFromString(withoutPlus, countryCode);
      }
      if (!phone?.isValid()) {
        const callingCode = getCountryCallingCode(countryCode);
        if (
          !withoutPlus.startsWith('+') &&
          withoutPlus.startsWith(callingCode)
        ) {
          phone = parsePhoneNumberFromString(`+${withoutPlus}`, countryCode);
        }
      }
    }

    if (!phone?.isValid()) {
      throw new BadRequestException('Invalid mobile number');
    }

    return {
      e164: phone.format('E.164'),
      countryCode: phone.country ?? countryCode,
      nationalNumber: phone.nationalNumber,
    };
  }

  isValid(input: string, countryCode: CountryCode = DEFAULT_COUNTRY): boolean {
    const candidate = input?.trim();
    if (!candidate) return false;
    try {
      const phone = parsePhoneNumberFromString(candidate, countryCode);
      return phone?.isValid() ?? false;
    } catch {
      return false;
    }
  }

  private withoutInternationalPrefix(value: string): string {
    if (value.startsWith('00')) {
      return `+${value.slice(2)}`;
    }
    return value;
  }
}
