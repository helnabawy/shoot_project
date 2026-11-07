import { describe, expect, it } from 'vitest'
import { creatorSummary } from '../../../tests/fixtures/creators'
import { describeCreator, initialsOf, type Lookups } from './describe'

const lookups: Lookups = {
  personas: new Map([['1', 'Photographer'], ['2', 'Videographer']]),
  specialties: new Map([['10', 'Portrait'], ['11', 'Events'], ['12', 'Wedding & engagement'], ['13', 'Fashion']]),
  locations: new Map([['100', 'Dubai Marina'], ['101', 'Jumeirah'], ['102', 'Al Ain']]),
}

describe('initialsOf', () => {
  it('takes the first letter of the first two words, upper-cased', () => {
    expect(initialsOf('sara khan')).toBe('SK')
    expect(initialsOf('  Omar   Al Haddad ')).toBe('OA')
    expect(initialsOf('Lina')).toBe('L')
    expect(initialsOf('سارة خان')).toBe('سخ')
    expect(initialsOf('')).toBe('')
  })
})

describe('CP-US1 creator row view', () => {
  it('joins types, shows the first place with +N and the formatted code', () => {
    const v = describeCreator(creatorSummary({ personaIds: ['1', '2'], locationIds: ['100', '101', '102'], specialtyIds: ['10'] }), lookups, 'CR', 'en')
    expect(v).toMatchObject({ name: 'Sara Khan', displayCode: 'CR-7K4Q2', initials: 'SK', types: 'Photographer and Videographer', place: 'Dubai Marina +2', specialties: 'Portrait' })
  })

  it('shows up to three specialties as plain text then +N, and skips unknown ids', () => {
    const v = describeCreator(creatorSummary({ specialtyIds: ['10', '11', '12', '13', '999'] }), lookups, 'CR', 'en')
    expect(v.specialties).toBe('Portrait, Events, Wedding & engagement +1')
  })

  it('uses the Arabic list separator and conjunction', () => {
    const ar = new Map([['1', 'مصوّر'], ['2', 'مصوّر فيديو']])
    const v = describeCreator(
      creatorSummary({ personaIds: ['1', '2'], specialtyIds: ['10', '11'] }),
      { ...lookups, personas: ar, specialties: new Map([['10', 'بورتريه'], ['11', 'فعاليات']]) },
      'CR',
      'ar',
    )
    expect(v.types).toBe('مصوّر ومصوّر فيديو')
    expect(v.specialties).toBe('بورتريه، فعاليات')
  })

  it('has empty place and specialties when the creator lists none', () => {
    const v = describeCreator(creatorSummary({ locationIds: [], specialtyIds: [] }), lookups, 'cr', 'en')
    expect(v).toMatchObject({ place: '', specialties: '', displayCode: 'CR-7K4Q2' })
  })
})
