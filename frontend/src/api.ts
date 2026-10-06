import type { Coordinate, InputError, PointViewModel } from './models';

export class SubmissionError extends Error {
  constructor(public readonly details: InputError) {
    super(details.message);
  }
}

export async function savePoint(name: string, coordinate: Coordinate): Promise<PointViewModel> {
  let response: Response;
  try {
    response = await fetch('/web/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, coordinate }),
    });
  } catch {
    throw new SubmissionError({
      message: 'Could not reach the server. Check your connection and try again.', fieldErrors: {},
    });
  }
  if (!response.ok) {
    let details: InputError = { message: 'The point could not be saved. Please try again.', fieldErrors: {} };
    if (response.status === 400) {
      try { details = await response.json() as InputError; } catch { /* Use the fallback message. */ }
    }
    throw new SubmissionError(details);
  }
  return response.json() as Promise<PointViewModel>;
}

