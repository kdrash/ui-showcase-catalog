// Zdog には型定義が同梱されていないため最小限の宣言(any)を置く
declare module 'zdog' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Zdog: any
  export default Zdog
}
