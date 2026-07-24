/** Simple asset loader */

export class AssetManager {
  private cache = new Map<string, HTMLImageElement>();
  private pending = new Map<string, Promise<HTMLImageElement>>();

  loadImage(key: string, url: string): Promise<HTMLImageElement> {
    const ex = this.cache.get(key);
    if (ex) return Promise.resolve(ex);
    const pen = this.pending.get(key);
    if (pen) return pen;
    const p = new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.onload = () => { this.cache.set(key, img); this.pending.delete(key); res(img); };
      img.onerror = () => { this.pending.delete(key); rej(new Error(`Failed: ${url}`)); };
      img.src = url;
    });
    this.pending.set(key, p);
    return p;
  }

  get(key: string): HTMLImageElement | undefined { return this.cache.get(key); }
  progress(): number {
    const total = this.pending.size + this.cache.size;
    return total === 0 ? 1 : this.cache.size / total;
  }
}