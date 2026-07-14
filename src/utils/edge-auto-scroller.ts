export class EdgeAutoScroller {
  private timer: ReturnType<typeof setInterval> | null = null;
  private direction = 0;
  private accumulatedScroll = 0;
  private lastTranslation = 0;

  constructor(
    private readonly scrollBy: (distance: number) => number,
    private readonly updateTranslation: (distance: number) => void,
  ) {}

  begin() {
    this.stopTimer();
    this.accumulatedScroll = 0;
    this.lastTranslation = 0;
  }

  update(translation: number, direction: number) {
    this.lastTranslation = translation;
    this.updateTranslation(translation + this.accumulatedScroll);
    if (direction === this.direction) return;
    this.stopTimer();
    this.direction = direction;
    if (direction === 0) return;
    this.timer = setInterval(() => {
      const applied = this.scrollBy(this.direction * 12);
      if (applied === 0) {
        this.stopTimer();
        return;
      }
      this.accumulatedScroll += applied;
      this.updateTranslation(this.lastTranslation + this.accumulatedScroll);
    }, 16);
  }

  finish(translation: number) {
    this.lastTranslation = translation;
    this.stopTimer();
    return translation + this.accumulatedScroll;
  }

  cancel() {
    this.stopTimer();
    this.accumulatedScroll = 0;
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.direction = 0;
  }
}
