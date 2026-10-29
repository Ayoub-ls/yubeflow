// Decides what a signed-in person may see. Pure, so it is easy to test.
export function accessState(profile) {
  if (!profile) return 'error'
  return profile.status === 'suspended' ? 'suspended' : 'ok'
}
