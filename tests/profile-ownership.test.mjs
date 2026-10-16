import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isProfileOwner } from '../src/utils/profileOwnership.ts';

test('profile ownership fails closed without a viewer and prefers matching account IDs', () => {
  assert.equal(isProfileOwner({ id: 'owner-1' }, null), false);
  assert.equal(isProfileOwner({ id: 'owner-1' }, undefined), false);
  assert.equal(isProfileOwner({ id: 'owner-1' }, { id: 'owner-1' }), true);
  assert.equal(isProfileOwner({ id: 'owner-1', email: 'same@example.test' }, { id: 'owner-2', email: 'same@example.test' }), false);
});

test('profile ownership falls back to normalized email only when an ID is unavailable', () => {
  assert.equal(isProfileOwner({ email: 'Student@Example.test' }, { email: 'student@example.test' }), true);
  assert.equal(isProfileOwner({ id: 'owner-1', email: 'a@example.test' }, { email: 'a@example.test' }), true);
  assert.equal(isProfileOwner({ email: 'a@example.test' }, { email: 'b@example.test' }), false);
  assert.equal(isProfileOwner({}, {}), false);
});

test('profile editor fails closed, uses one cover workflow, and never persists a failed crop as a data URL', () => {
  const profile = readFileSync('src/components/ProfileModal.tsx', 'utf8');
  const cropHandler = profile.slice(profile.indexOf('const handleConfirmFacebookCrop'), profile.indexOf('const beginFbCropDrag'));
  assert.ok(profile.includes('isProfileOwner(currentUser, viewerUser)'), 'Missing viewer identity must not imply ownership');
  assert.ok(profile.includes('viewerUser.id !== currentUser.id'), 'Save callback must also verify the signed-in owner');
  assert.ok(profile.includes('onSaveProfile(updates, currentUser.id)'), 'Profile save is scoped to the current account');
  assert.ok(profile.includes("uploadProcessedImage('banner', prepared.dataUrl)"), 'Cover uploads use the authenticated media pipeline');
  assert.ok(!profile.includes("openFacebookCropper('banner'"), 'Covers must not open a second cropper');
  assert.ok(!profile.includes('overview-banner-upload'), 'Cover controls belong only to the Edit tab');
  assert.ok(cropHandler.includes("uploadProcessedImage('avatar', croppedDataUrl)"), 'Avatar crop must upload before applying');
  assert.ok(!cropHandler.includes('onSaveProfile'), 'A failed upload cannot persist the cropped data URL');
  assert.ok(profile.includes("fit: 'cover'"), 'Profile cover previews and saves always use cover fit');
  assert.ok(profile.includes('profile-gender-choice'), 'Gender options use clear icon-backed buttons');
  assert.ok(profile.includes('Sửa hồ sơ'), 'The Edit tab has an action label, not a Settings duplicate');
});
