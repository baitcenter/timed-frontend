import {
  authenticateSession,
  invalidateSession
} from 'timed/tests/helpers/ember-simple-auth'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import destroyApp from '../helpers/destroy-app'
import startApp from '../helpers/start-app'
import { find, click } from 'ember-native-dom-helpers'

describe('Acceptance | analysis edit', function() {
  let application

  beforeEach(async function() {
    application = startApp()

    let user = server.create('user', {
      firstName: 'foo',
      lastName: 'bar'
    })
    this.user = user

    // eslint-disable-next-line camelcase
    await authenticateSession(application, { user_id: user.id })

    server.create('report-intersection', { verified: false })
  })

  afterEach(async function() {
    await invalidateSession(application)
    destroyApp(application)
  })

  it('can visit /analysis/edit', async function() {
    await visit('/analysis/edit')

    expect(currentURL()).to.equal('/analysis/edit')
  })

  it('can edit', async function() {
    await visit('/analysis/edit?id=1,2,3')

    let res = {}

    server.post('/reports/bulk', (_, { requestBody }) => {
      res = JSON.parse(requestBody)
    })

    await fillIn('[data-test-comment] input', 'test comment 123')
    await click('[data-test-not-billable] input')
    await click('[data-test-review] input')

    await click('.btn-primary')

    let { data: { type, attributes, relationships } } = res

    expect(type).to.equal('report-bulks')

    // only changed attributes were sent
    expect(Object.keys(attributes)).to.deep.equal([
      'comment',
      'not-billable',
      'review'
    ])
    expect(Object.keys(relationships)).to.deep.equal([
      'customer',
      'project',
      'task'
    ])

    expect(currentURL()).to.equal('/analysis')
  })

  it('can cancel', async function() {
    await visit('/analysis/edit')

    await click('[data-test-cancel]')

    expect(currentURL()).to.equal('/analysis')
  })

  it('can reset', async function() {
    await visit('/analysis/edit')

    await fillIn('[data-test-comment] input', 'test')

    expect(find('[data-test-comment] input').value).to.equal('test')

    await click('[data-test-reset]')

    expect(find('[data-test-comment] input').value).to.not.equal('test')
  })

  it('can not verify', async function() {
    await visit('/analysis/edit')

    expect(find('[data-test-verified] input').disabled).to.equal(true)
  })

  it('saves changes to store first', async function() {
    let project = server.create('project', { reviewers: [this.user] })
    let task = server.create('task', { project: project })
    let report = server.create('report', { task: task })

    await visit('/analysis')
    await visit(`/analysis/edit?id=${report.id}&reviewer=${this.user.id}`)

    await fillIn('[data-test-comment] input', 'test')
    await click('[data-test-verified] div input')
    await click('.btn-primary')

    expect(find('tbody tr:first-child td:nth-child(8)').innerHTML).to.equal(
      'foob'
    )
    expect(
      find('tbody tr:first-child td:nth-child(7) span').innerHTML
    ).to.equal('test')

    await click('[data-test-refresh]')

    await visit(`/analysis/edit?id=${report.id}&reviewer=${this.user.id}`)
    await click('[data-test-verified] div input')
    await click('.btn-primary')

    expect(find('tbody tr:first-child td:nth-child(8)').innerHTML).to.equal('')
  })
})
