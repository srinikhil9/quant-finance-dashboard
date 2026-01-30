declare module 'jstat' {
  interface Normal {
    cdf(x: number, mean: number, std: number): number;
    pdf(x: number, mean: number, std: number): number;
    inv(p: number, mean: number, std: number): number;
  }

  interface JStatStatic {
    normal: Normal;
  }

  const jstat: JStatStatic;
  export default jstat;
}
