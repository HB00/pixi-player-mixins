import * as echarts from 'echarts';

echarts.Model.prototype.isAnimationEnabled = () => true;
echarts.SeriesModel.prototype.isAnimationEnabled = () => true;

const COLORS = [
  '#c23531', '#2f4554', '#61a0a8', '#d48265', '#91c7ae', '#E062AE', '#fb7293', '#ff9f7f',
  '#ca8622', '#bda29a', '#6e7074', '#546570', '#c4ccd3', '#dd6b66', '#759aa0', '#e69d87',
  '#8dc1a9', '#ea7e53', '#eedd78', '#73a373', '#73b9bc', '#7289ab', '#91ca8c', '#749f83',
];

const DEFAULT_CONF = {
  theme: 'light', movieType: 'start',
  width: '100vw', height: '100vh', colors: COLORS,
};

const mixin = {
  defaultConf(key) {
    return DEFAULT_CONF[key];
  },

  async preload() {
    let option = await this.parseOption();
    if (!option || !option.series) return; // error
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.getConf('width');
    this.canvas.height = this.getConf('height');

    // set animation opt
    const movieType = this.getConf('movieType', false);
    option = { 
      animationDuration: movieType === 'start' ? 1000 : 0,
      animationDurationUpdate: 1000,
      animationEasing: 'linear',
      animationEasingUpdate: 'linear',
      ...option
    };
    this.aniDuration = option.animationDurationUpdate;

    this.chart = echarts.init(this.canvas, this.getConf('theme'));
    this.fixZRender(); // 必须放在setOption之前
    this.chart.setOption(option);
    this.updateData(0); // 数据归零
  },

  async render(nodeTime, playing, view) {
    const [ width, height ] = [this.getConf('width'), this.getConf('height')];
    const canvas = view.source;
    canvas.width = width;
    canvas.height = height;
    // width/height may not rounded, so use canvas size instead
    if (this.canvas.width != canvas.width || this.canvas.height != canvas.height) {
      this.chart.resize({ width: canvas.width, height: canvas.height });
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { chart } = this;
    const animation = chart._zr.animation;

    const next = Math.ceil(nodeTime);
    const prev = Math.max(0, next - 1);
    const reset = animation._time > nodeTime * 1000;
    let prevChanged = false;

    if (this.nextTimer !== next || reset) {
      if (this.prevTimer !== prev || reset) {
        this.updateData(prev);
        this.prevTimer = prev;
        prevChanged = true;
        // console.log('prev', prev);
      }

      this.updateData(next);
      this.nextTimer = next;
      this.prevTimer = next;
      // console.log('next', next);
    }

    if (reset) {
      animation.update(true, 0);
      animation.stop();
      animation._time = 0;
      // 完整的周期，让动画测底释放
      animation.update(false, this.aniDuration);
    }

    if (prevChanged) animation.update(false, prev * 1000);
    animation.update(false, (nodeTime * 1000) >> 0);

    ctx.drawImage(this.canvas, 0, 0);
    view.update();
  },

  async parseOption() {
    let template = this.getConf('template', false);
    let data = this.getConf('data', false);

    // todo: try catch
    this.template = require(`./templates/${template}.js`);

    let option;
    if (data) {
      data = await this.parseData(data);
      // render template
      if (Array.isArray(data) && Array.isArray(data[0])) {
        this.data = data; // todo: clone?
        this.length = data[0].length;
        option = this.updateData(0, false);
      }
    }
    return option;
  },

  async parseData(data) {
    try {
      if (typeof(data) === 'object' && data.innerHTML) {
        data = JSON.parse(data.innerHTML);
      } else if (typeof(data) === 'string' && data.startsWith('http')) {
        data = await this.getRemoteData(data);
      } else if (typeof(data) === 'string') {
        data = JSON.parse(data);
      }
    } catch (e) { }
    return data;
  },

  updateData(ti, update=true) {
    if (!this.data) return; // 只支持套模板的
    const colors = this.getConf('colors', false);
    const { chart } = this;
    let xs, ys;
    const movieType = this.getConf('movieType', false);
    if (movieType === 'add') {
      // 第一列，合并后，前N个之后，add
      const start = this.conf.moiveStart || 2; // 除了head, 至少1个数
      xs = this.xs(this.data[0]);
      ys = this.ys(this.data, xs.slice(0, start + ti));
    } else if (movieType === 'move') {
      // 第一列，合并后，按表格顺序往下走
      const x = this.xs(this.data[0])[ti + 1];
      if (x === undefined) return; // at end
      xs = this.data.map(x => x[0]);
      ys = this.ys(this.data, [x]).map(y => y[0]);
    // } else if (movieType === 'swap') {
    //   return;
    } else {
      return;
    }
    const option = this.template(xs, ys);
    if (colors) {
      option.series[0].itemStyle = { color: (p) => {
        return colors[p.dataIndex];
      }}
    }
    if (update) chart.setOption(option);
    return option;
  },

  xs(data) {
    const xs = [];
    for (let i of data) {
      if (!xs.includes(i)) xs.push(i);
    }
    return xs;
  },

  ys(data, xs) {
    const ys = [];
    for (let _ in data) {
      ys.push([]);
    }

    for (let i in data[0]) {
      const x = data[0][i];
      if (!xs.includes(x)) continue;
      for (let j in data) {
        ys[j].push(data[j][i]);
      }
    }
    return ys;
  },

  fixZRender() {
    // https://github.com/ecomfe/zrender/
    // source: src/animation/Animation.ts
    const { chart } = this;
    const animation = chart._zr.animation;
    animation.start = function () {
      if (this._running) return;
      // this._time = getTime();
      this._time = 0; // set to 0
      this._pausedTime = 0;
      this._startLoop();
    }

    animation._startLoop = function () {
      this._running = true;
      // requestAnimationFrame(step);
    }

    animation.update = function (notTriggerFrameAndStageUpdate, time) {
      if (time === undefined) {
        // console.log('update without time!');
        return;
      }
      let clip = this._head;
      // const time = getTime() - this._pausedTime;
      const delta = time - this._time;
      this._time = time;

      // console.log('updated', {time, delta});
      while (clip) {
        const nextClip = clip.next;
        let finished = clip.step(time, delta);
        if (finished) {
          clip.ondestroy && clip.ondestroy();
          this.removeClip(clip);
          clip = nextClip;
        } else {
          clip = nextClip;
        }
      }

      if (!notTriggerFrameAndStageUpdate) {
        this.trigger('frame', delta);
        this.stage.update && this.stage.update();
      }
    };
  },
}

if (window["pixi-player"].regMixin) {
  window["pixi-player"].regMixin({ 'echart': mixin });
}

export { mixin };