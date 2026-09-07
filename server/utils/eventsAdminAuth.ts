/** Checks the query credential without distinguishing missing configuration from a wrong token. */
export const isEventsAdminTokenValid = (configured: unknown, supplied: unknown) => {
  if (typeof configured !== 'string' || !configured || typeof supplied !== 'string') return false
  if (configured.length !== supplied.length) return false
  let difference = 0
  for (let index = 0; index < configured.length; index += 1) {
    difference |= configured.charCodeAt(index) ^ supplied.charCodeAt(index)
  }
  return difference === 0
}
