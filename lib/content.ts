export function withoutType<T extends { _type: string }>(value: T): Omit<T, "_type"> {
  const { _type, ...content } = value;
  void _type;
  return content;
}
