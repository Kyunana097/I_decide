Page({
    data: {
      rotateAngle: 0,      // 当前旋转角度
      isSpinning: false,   // 是否正在旋转
      duration: 4000,      // 动画时长（毫秒）
      result: '',          // 结果
      // 用户配置：分区1占整圈的百分比（n%），分区2为 100-n
      sectorPercent: 30,
      userPercent: 50,
      // 两个分区的文字
      sector1Text: '打游戏',
      sector2Text: '干活',
      // 显示在转盘上的两个分区文字（会做长度截断）
      sector1Label: '',
      sector2Label: '',
      // 彩纸动画
      showConfetti: false,
      confettiList: [],
      // 配置窗口相关
      showConfig: false,
      editUserPercent: 50,
      editSector1Text: '选项一',
      editSector2Text: '选项二',
      // 由 JS 计算出来的扇形样式（包含 transform 和 clip-path）
      sectorStyle: ''
    },

    onLoad() {
      const sectorStyle = this.computeSectorStyle(this.data.sectorPercent, this.data.rotateAngle);
      const sector1Label = this.makeLabel(this.data.sector1Text);
      const sector2Label = this.makeLabel(this.data.sector2Text);
      this.setData({ sectorStyle, sector1Label, sector2Label });
    },

    startSpin() {
      if (this.data.isSpinning) return;

      // 计算随机角度：至少转5圈（1800度）+ 随机0-360度
      const minSpins = 5;
      const randomAngle = Math.floor(Math.random() * 270);
      const totalAngle = this.data.rotateAngle + (minSpins * 360) + randomAngle;

      // 先根据新的总角度和当前扇形百分比计算扇形样式
      const sectorStyle = this.computeSectorStyle(this.data.sectorPercent, totalAngle);

      this.setData({
        isSpinning: true,
        rotateAngle: totalAngle,
        result: '',
        sectorStyle
      });

      // 动画结束后计算结果
      setTimeout(() => {
        this.calculateResult();
      }, this.data.duration);
    },


    // 打开配置窗口
    openConfig() {
      this.setData({
        showConfig: true,
        editUserPercent: this.data.sectorPercent,
        editSector1Text: this.data.sector1Text,
        editSector2Text: this.data.sector2Text
      });
    },

    // 关闭配置窗口（不保存）
    closeConfig() {
      this.setData({
        showConfig: false
      });
    },

    // 编辑分区1比例（n%，分区2自动为 100-n）
    onEditPercent(e) {
      this.setData({
        editUserPercent: e.detail.value
      });
    },

    // 编辑分区1文字
    onEditSector1Text(e) {
      this.setData({
        editSector1Text: e.detail.value
      });
    },

    // 编辑分区2文字
    onEditSector2Text(e) {
      this.setData({
        editSector2Text: e.detail.value
      });
    },

    // 应用配置
    applyConfig() {
      const raw = String(this.data.editUserPercent).trim();

      // 只允许整数：如果包含小数点/非数字，则不更改，直接提示
      if (!/^\d+$/.test(raw)) {
        wx.showToast({
          title: '请输入整数百分比',
          icon: 'none'
        });
        // 还原输入框显示为当前生效的比例
        this.setData({ editUserPercent: this.data.sectorPercent });
        return;
      }

      let p = parseInt(raw, 10);
      if (isNaN(p)) {
        p = this.data.sectorPercent;
      }
      // 限制在 1%~99%，保证两个分区都有面积
      p = Math.max(1, Math.min(99, p));

      const text1 = (this.data.editSector1Text || '选项一').trim();
      const text2 = (this.data.editSector2Text || '选项二').trim();

      const sector1Label = this.makeLabel(text1);
      const sector2Label = this.makeLabel(text2);
      const sectorStyle = this.computeSectorStyle(p, this.data.rotateAngle);

      this.setData({
        sectorPercent: p,
        userPercent: p,
        sector1Text: text1,
        sector2Text: text2,
        sector1Label,
        sector2Label,
        sectorStyle,
        showConfig: false
      });
    },

    calculateResult() {
      // 指针始终指向分区1的扇形，因此结果固定为分区1的文字
      const chosen = this.data.sector1Text;
      const display = this.makeLabel(chosen);

      this.setData({
        isSpinning: false,
        result: display
      });

      // 决策完成后触发一次彩纸动画
      this.launchConfetti();
    },

    // 把文字转成适合在转盘上展示的短标签（>3 个“字符”时加省略号，支持 emoji）
    makeLabel(text) {
      const t = (text || '').trim() || '';
      // 按字符遍历，避免把一个 emoji 截成两半
      const chars = [];
      for (const ch of t) {
        chars.push(ch);
      }
      if (chars.length > 3) {
        return chars.slice(0, 3).join('') + '…';
      }
      return t;
    },

    // 根据百分比（n%）和当前旋转角度，生成“近似圆弧”的扇形 style 字符串
    // n% -> 扇形中心角 = 360 * n / 100
    computeSectorStyle(percent, rotateAngle) {
      const ratio = Math.max(0.01, Math.min(1, percent / 100));
      const centerAngle = 360 * ratio;
      const half = centerAngle / 2;

      // 采样点数量：角度越大点越多，最少 6 个
      const steps = Math.max(6, Math.round(centerAngle / 6));
      const points = [];

      // 圆心
      points.push('50% 50%');

      // 从左边界 (-half) 到右边界 (+half) 依次采样
      for (let i = 0; i <= steps; i++) {
        const angle = -half + (centerAngle * i / steps); // 以指针方向为 0° 的偏移角
        const rad = angle * Math.PI / 180;

        // 以圆心(50,50)为原点，半径 50；0° 取正上方
        const x = 50 + 50 * Math.sin(rad);
        const y = 50 - 50 * Math.cos(rad);

        points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
      }

      const clipPath = `polygon(${points.join(', ')})`;

      // 扇形跟随指针旋转，保证指针始终在扇形中心
      return `transform: rotate(${rotateAngle}deg); background: #0077ff; clip-path: ${clipPath};`;
    },

    copyGitHub() {
      const url = 'https://github.com/Kyunana097/I_decide'; // 你的仓库地址
      wx.setClipboardData({
        data: url,
        success: () => {
          wx.showToast({
            title: '链接已复制',
            icon: 'success',
            duration: 2000
          });
        }
      });
    },

  launchConfetti() {
    const colors = [
      '#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', 
      '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3',
      '#ff9f43', '#ee5a24', '#0abde3', '#10ac84',
      '#ff7675', '#fdcb6e', '#74b9ff', '#55efc4'
    ];
    
    const shapes = ['square', 'circle', 'rect', 'strip'];
    const animations = ['confetti-fall', 'confetti-sway-1', 'confetti-sway-2', 'confetti-spiral'];
    const count = 100;
    
    const list = [];
  
    for (let i = 0; i < count; i++) {
      // 随机水平位置
      const left = 5 + Math.random() * 90;
      
      // 随机延迟，形成连续效果
      const delay = Math.random() * 600;
      
      // 随机下落时长（2-4秒）
      const duration = 2 + Math.random() * 2;
      
      // 随机颜色
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // 随机形状和大小
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      let width, height, borderRadius;
      
      switch(shape) {
        case 'circle':
          width = 8 + Math.random() * 6;
          height = width;
          borderRadius = '50%';
          break;
        case 'rect':
          width = 12 + Math.random() * 8;
          height = 4 + Math.random() * 4;
          borderRadius = '2rpx';
          break;
        case 'strip':
          width = 4 + Math.random() * 4;
          height = 16 + Math.random() * 12;
          borderRadius = '2rpx';
          break;
        default: // square
          width = 6 + Math.random() * 6;
          height = width;
          borderRadius = '1rpx';
      }
      
      // 随机动画类型
      const animClass = animations[Math.floor(Math.random() * animations.length)];
      
      // 随机旋转参数（CSS变量）
      const startRotate = Math.floor(Math.random() * 360);
      const endRotate = startRotate + 360 + Math.floor(Math.random() * 720); // 至少转一圈，最多三圈
      const driftX = (Math.random() - 0.5) * 30; // -15vw 到 +15vw
      
      const style = `
        left: ${left}%;
        top: 0;
        margin-top: -30rpx;        /* 向上偏移，部分在屏幕外 */
        width: ${width}rpx;
        height: ${height}rpx;
        background: ${color};
        border-radius: ${borderRadius};
        animation-delay: ${delay}ms;
        animation-duration: ${duration}s;
        --start-rotate: ${startRotate}deg;
        --end-rotate: ${endRotate}deg;
        --drift-x: ${driftX}vw;
      `;
  
      list.push({ 
        style, 
        class: animClass,
        id: i 
      });
    }
  
    this.setData({
      showConfetti: true,
      confettiList: list
    });
  
    setTimeout(() => {
      this.setData({ showConfetti: false, confettiList: [] });
    }, 4500);
  }
  
})