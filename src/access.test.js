import test from 'node:test'
import assert from 'node:assert/strict'
import { accessState } from './access.js'

test('active accounts and admins get in', () => {
  assert.equal(accessState({ role: 'user', status: 'active' }), 'ok')
  assert.equal(accessState({ role: 'admin', status: 'active' }), 'ok')
})
test('suspended accounts are blocked, a missing profile is an error', () => {
  assert.equal(accessState({ role: 'user', status: 'suspended' }), 'suspended')
  assert.equal(accessState({ role: 'admin', status: 'suspended' }), 'suspended')
  assert.equal(accessState(null), 'error')
})
