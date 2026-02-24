export const AGE_GROUP_LEVELS = {
  AK: "AK",
  AY: "AY",
  AP: "AP",
  AMW: "AMW",
  AS: "AS",
} as const

export type AgeGroupLevel = (typeof AGE_GROUP_LEVELS)[keyof typeof AGE_GROUP_LEVELS]

const AGE_GROUP_LABELS: Record<AgeGroupLevel, string> = {
  [AGE_GROUP_LEVELS.AK]: "Anointed Kids (AK)",
  [AGE_GROUP_LEVELS.AY]: "Anointed Youth (AY)",
  [AGE_GROUP_LEVELS.AP]: "Anointed Professionals (AP)",
  [AGE_GROUP_LEVELS.AMW]: "Anointed Men and Women (AMW)",
  [AGE_GROUP_LEVELS.AS]: "Anointed Seniors (AS)",
}

export function getAgeGroupDisplayName(ageGroup: AgeGroupLevel): string {
  return AGE_GROUP_LABELS[ageGroup]
}

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
  if (age <= 22) return AGE_GROUP_LEVELS.AY
  if (age <= 40) return AGE_GROUP_LEVELS.AP
  if (age <= 59) return AGE_GROUP_LEVELS.AMW
  return AGE_GROUP_LEVELS.AS
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
