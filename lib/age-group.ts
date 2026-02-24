export const AGE_GROUP_LEVELS = {
  AK: "AK",
  AY: "AY",
  AP: "AP",
  AYA: "AYA",
  AMW: "AMW",
} as const

export type AgeGroupLevel = (typeof AGE_GROUP_LEVELS)[keyof typeof AGE_GROUP_LEVELS]

export function calculateAgeFromBirthday(dateOfBirth: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dateOfBirth.getFullYear()

  const monthDifference = today.getMonth() - dateOfBirth.getMonth()

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1
  }

  return age
}

export function resolveAgeGroupFromAge(age: number): AgeGroupLevel {
  if (age <= 12) return AGE_GROUP_LEVELS.AK
  if (age <= 17) return AGE_GROUP_LEVELS.AY
  if (age <= 35) return AGE_GROUP_LEVELS.AP
  if (age <= 59) return AGE_GROUP_LEVELS.AYA
  return AGE_GROUP_LEVELS.AMW
}

export function resolveAgeGroupFromBirthday(
  birthdayIsoDate: string
): { age: number; ageGroup: AgeGroupLevel } {
  const birthDate = new Date(birthdayIsoDate)

  if (Number.isNaN(birthDate.getTime())) {
    throw new Error("Invalid birthday format")
  }

  const age = calculateAgeFromBirthday(birthDate)

  if (age < 0 || age > 120) {
    throw new Error("Invalid birthday value")
  }

  return {
    age,
    ageGroup: resolveAgeGroupFromAge(age),
  }
}
