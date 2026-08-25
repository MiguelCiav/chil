/**
 * Splits a full name string into first_names and last_names components.
 */
export function splitFullName(name: string): { first_names: string; last_names: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 4) {
    return {
      first_names: parts.slice(0, 2).join(' '),
      last_names: parts.slice(2).join(' ')
    };
  } else if (parts.length === 3) {
    return {
      first_names: parts[0],
      last_names: parts.slice(1).join(' ')
    };
  } else if (parts.length === 2) {
    return {
      first_names: parts[0],
      last_names: parts[1]
    };
  } else {
    return {
      first_names: name,
      last_names: ''
    };
  }
}
