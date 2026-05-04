export function getSizeClass(size: string): string {
  switch (size) {
    case 'large':
      return 'w-16 h-16 p-4';
    case 'medium':
      return 'w-12 h-12 p-3';
    case 'small':
      return 'w-10 h-10 p-2';
    default:
      return 'w-12 h-12 p-3';
  }
}
