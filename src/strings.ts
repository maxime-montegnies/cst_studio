export const strings = {
    greeting: 'CST \n studio.',
} as const

export type StringKey = keyof typeof strings

export function t(key: StringKey): string {
    return strings[key]
}
