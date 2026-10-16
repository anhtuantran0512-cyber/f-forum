export interface ProfileIdentity {
  id?: string | null;
  email?: string | null;
}

/** Fail closed: prefer stable IDs; only fall back to email when an ID is missing. */
export const isProfileOwner = (
  profile: ProfileIdentity | null | undefined,
  viewer: ProfileIdentity | null | undefined,
): boolean => {
  if (!profile || !viewer) return false;

  const profileId = String(profile.id || '').trim();
  const viewerId = String(viewer.id || '').trim();
  if (profileId && viewerId) return profileId === viewerId;

  const profileEmail = String(profile.email || '').trim().toLowerCase();
  const viewerEmail = String(viewer.email || '').trim().toLowerCase();
  return Boolean(profileEmail && viewerEmail && profileEmail === viewerEmail);
};
