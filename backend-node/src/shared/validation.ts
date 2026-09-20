import { ApiError } from '@http/api-error';


export function stringFields(
  input: Record<string, unknown>,
  fields: string[],
) {
  for (const field of fields) {
    if (field in input && typeof input[field] !== 'string') {
      throw new ApiError(400, ['Bad Request']);
    }
  }
}

export function lengths(
  input: Record<string, unknown>,
  limits: Record<string, [number, number]>,
) {
  const errors: Record<string, string> = {};

  for (const [field, [min, max]] of Object.entries(limits)) {
    if (!(field in input)) {
      continue;
    }

    const length: number = [...String(input[field])].length;

    if (length < min) {
      errors[field] = `This value is too short. It should have ${ min } characters or more.`;
    }

    if (length > max) {
      errors[field] = `This value is too long. It should have ${ max } characters or less.`;
    }
  }

  if (Object.keys(errors).length) {
    throw new ApiError(406, errors);
  }
}
