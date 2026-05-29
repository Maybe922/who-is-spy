import { PrismaClient, WordPackSource } from "@prisma/client";

type SeedPack = {
  name: string;
  themePrompt?: string;
  source: WordPackSource;
  pairs: Array<{ civilian: string; spy: string }>;
};

const prisma = new PrismaClient();

const packs: SeedPack[] = [
  {
    name: "经典默认题库",
    source: WordPackSource.BUILTIN,
    pairs: [
      { civilian: "牛奶", spy: "豆浆" },
      { civilian: "火锅", spy: "麻辣烫" },
      { civilian: "手机", spy: "平板" },
      { civilian: "地铁", spy: "高铁" },
      { civilian: "咖啡", spy: "奶茶" },
      { civilian: "键盘", spy: "钢琴" },
      { civilian: "医生", spy: "护士" },
      { civilian: "电影", spy: "电视剧" },
      { civilian: "西瓜", spy: "哈密瓜" },
      { civilian: "篮球", spy: "排球" },
      { civilian: "雨伞", spy: "遮阳伞" },
      { civilian: "饺子", spy: "包子" },
      { civilian: "冰箱", spy: "空调" },
      { civilian: "小说", spy: "漫画" },
      { civilian: "猫眼", spy: "门铃" },
      { civilian: "酒店", spy: "民宿" },
      { civilian: "牙刷", spy: "梳子" },
      { civilian: "书包", spy: "行李箱" },
      { civilian: "月亮", spy: "太阳" },
      { civilian: "耳机", spy: "音箱" },
      { civilian: "电梯", spy: "扶梯" },
      { civilian: "沙发", spy: "床垫" },
      { civilian: "外卖", spy: "堂食" },
      { civilian: "超市", spy: "便利店" },
      { civilian: "闹钟", spy: "手表" }
    ]
  },
  {
    name: "小时候的动画片",
    themePrompt: "小时候的动画片",
    source: WordPackSource.CUSTOM,
    pairs: [
      { civilian: "喜羊羊", spy: "懒羊羊" },
      { civilian: "灰太狼", spy: "红太狼" },
      { civilian: "虹猫", spy: "蓝兔" },
      { civilian: "数码宝贝", spy: "神奇宝贝" },
      { civilian: "大头儿子", spy: "小头爸爸" },
      { civilian: "熊大", spy: "熊二" },
      { civilian: "黑猫警长", spy: "一只耳" },
      { civilian: "樱桃小丸子", spy: "蜡笔小新" },
      { civilian: "哆啦A梦", spy: "大雄" },
      { civilian: "葫芦娃", spy: "蛇精" },
      { civilian: "海尔兄弟", spy: "蓝猫淘气" },
      { civilian: "哪吒传奇", spy: "西游记动画" },
      { civilian: "四驱兄弟", spy: "足球小将" },
      { civilian: "猫和老鼠", spy: "米老鼠" },
      { civilian: "名侦探柯南", spy: "金田一少年" },
      { civilian: "奥特曼", spy: "假面骑士" },
      { civilian: "百变小樱", spy: "美少女战士" },
      { civilian: "围棋少年", spy: "中华小子" },
      { civilian: "成龙历险记", spy: "神兵小将" },
      { civilian: "天线宝宝", spy: "花园宝宝" },
      { civilian: "蓝精灵", spy: "聪明的一休" },
      { civilian: "小鲤鱼历险记", spy: "洛洛历险记" },
      { civilian: "猪猪侠", spy: "果宝特攻" },
      { civilian: "秦时明月", spy: "侠岚" },
      { civilian: "马丁的早晨", spy: "神厨小福贵" }
    ]
  },
  {
    name: "日常生活",
    source: WordPackSource.CUSTOM,
    pairs: [
      { civilian: "洗衣机", spy: "烘干机" },
      { civilian: "拖把", spy: "扫把" },
      { civilian: "洗发水", spy: "沐浴露" },
      { civilian: "充电器", spy: "数据线" },
      { civilian: "路由器", spy: "光猫" },
      { civilian: "快递", spy: "外卖" },
      { civilian: "电动车", spy: "自行车" },
      { civilian: "公交卡", spy: "地铁卡" },
      { civilian: "钥匙", spy: "门禁卡" },
      { civilian: "钱包", spy: "卡包" },
      { civilian: "洗碗", spy: "做饭" },
      { civilian: "租房", spy: "买房" },
      { civilian: "加班", spy: "调休" },
      { civilian: "开会", spy: "汇报" },
      { civilian: "打车", spy: "拼车" },
      { civilian: "导航", spy: "地图" },
      { civilian: "自拍", spy: "合照" },
      { civilian: "朋友圈", spy: "微博" },
      { civilian: "红包", spy: "转账" },
      { civilian: "空调遥控器", spy: "电视遥控器" },
      { civilian: "保温杯", spy: "马克杯" },
      { civilian: "雨衣", spy: "雨伞" },
      { civilian: "拖鞋", spy: "凉鞋" },
      { civilian: "纸巾", spy: "湿巾" },
      { civilian: "口罩", spy: "帽子" }
    ]
  },
  {
    name: "食物饮料",
    source: WordPackSource.CUSTOM,
    pairs: [
      { civilian: "可乐", spy: "雪碧" },
      { civilian: "烧烤", spy: "炸串" },
      { civilian: "米饭", spy: "面条" },
      { civilian: "馄饨", spy: "云吞" },
      { civilian: "汉堡", spy: "三明治" },
      { civilian: "披萨", spy: "馅饼" },
      { civilian: "蛋糕", spy: "面包" },
      { civilian: "冰淇淋", spy: "雪糕" },
      { civilian: "酸奶", spy: "牛奶" },
      { civilian: "豆腐脑", spy: "豆浆" },
      { civilian: "煎饼果子", spy: "鸡蛋灌饼" },
      { civilian: "螺蛳粉", spy: "酸辣粉" },
      { civilian: "炸鸡", spy: "烤鸡" },
      { civilian: "薯条", spy: "薯片" },
      { civilian: "火腿肠", spy: "香肠" },
      { civilian: "小龙虾", spy: "螃蟹" },
      { civilian: "苹果", spy: "梨" },
      { civilian: "橙子", spy: "橘子" },
      { civilian: "葡萄", spy: "提子" },
      { civilian: "绿茶", spy: "红茶" },
      { civilian: "拿铁", spy: "美式" },
      { civilian: "珍珠奶茶", spy: "椰果奶茶" },
      { civilian: "火锅底料", spy: "麻辣香锅" },
      { civilian: "寿司", spy: "饭团" },
      { civilian: "粽子", spy: "年糕" }
    ]
  },
  {
    name: "影视娱乐",
    source: WordPackSource.CUSTOM,
    pairs: [
      { civilian: "甄嬛传", spy: "如懿传" },
      { civilian: "武林外传", spy: "家有儿女" },
      { civilian: "跑男", spy: "极限挑战" },
      { civilian: "快乐大本营", spy: "天天向上" },
      { civilian: "流浪地球", spy: "三体" },
      { civilian: "哈利波特", spy: "指环王" },
      { civilian: "漫威", spy: "DC" },
      { civilian: "蜘蛛侠", spy: "钢铁侠" },
      { civilian: "周杰伦", spy: "林俊杰" },
      { civilian: "陈奕迅", spy: "张学友" },
      { civilian: "演唱会", spy: "音乐节" },
      { civilian: "电影院", spy: "剧场" },
      { civilian: "脱口秀", spy: "相声" },
      { civilian: "密室逃脱", spy: "剧本杀" },
      { civilian: "王者荣耀", spy: "英雄联盟" },
      { civilian: "原神", spy: "崩坏" },
      { civilian: "和平精英", spy: "穿越火线" },
      { civilian: "Switch", spy: "PlayStation" },
      { civilian: "直播", spy: "短视频" },
      { civilian: "弹幕", spy: "评论区" },
      { civilian: "热搜", spy: "头条" },
      { civilian: "偶像剧", spy: "古装剧" },
      { civilian: "纪录片", spy: "综艺" },
      { civilian: "主角", spy: "配角" },
      { civilian: "预告片", spy: "花絮" }
    ]
  },
  {
    name: "校园回忆",
    source: WordPackSource.CUSTOM,
    pairs: [
      { civilian: "班主任", spy: "教导主任" },
      { civilian: "作业", spy: "试卷" },
      { civilian: "课桌", spy: "讲台" },
      { civilian: "粉笔", spy: "黑板擦" },
      { civilian: "校服", spy: "班服" },
      { civilian: "早读", spy: "晚自习" },
      { civilian: "体育课", spy: "课间操" },
      { civilian: "同桌", spy: "前桌" },
      { civilian: "班长", spy: "课代表" },
      { civilian: "食堂", spy: "小卖部" },
      { civilian: "考试", spy: "测验" },
      { civilian: "排名", spy: "成绩单" },
      { civilian: "请假条", spy: "检讨书" },
      { civilian: "红领巾", spy: "校牌" },
      { civilian: "升旗仪式", spy: "开学典礼" },
      { civilian: "寒假", spy: "暑假" },
      { civilian: "毕业照", spy: "学生证" },
      { civilian: "图书馆", spy: "自习室" },
      { civilian: "实验室", spy: "电脑房" },
      { civilian: "家长会", spy: "班会" },
      { civilian: "橡皮", spy: "修正带" },
      { civilian: "铅笔盒", spy: "书包" },
      { civilian: "卷子", spy: "答题卡" },
      { civilian: "午休", spy: "课间" },
      { civilian: "广播体操", spy: "眼保健操" }
    ]
  }
];

async function main() {
  for (const pack of packs) {
    const existingPack = await prisma.wordPack.findFirst({
      where: {
        name: pack.name,
        ownerUserId: null
      },
      select: { id: true }
    });

    const wordPack = existingPack
      ? await prisma.wordPack.update({
          where: { id: existingPack.id },
          data: {
            themePrompt: pack.themePrompt ?? null,
            source: pack.source,
            enabled: true
          },
          select: { id: true }
        })
      : await prisma.wordPack.create({
          data: {
            name: pack.name,
            themePrompt: pack.themePrompt ?? null,
            source: pack.source,
            enabled: true
          },
          select: { id: true }
        });

    await prisma.wordPair.deleteMany({ where: { packId: wordPack.id } });
    await prisma.wordPair.createMany({
      data: pack.pairs.map((pair) => ({
        packId: wordPack.id,
        civilian: pair.civilian,
        spy: pair.spy,
        enabled: true
      }))
    });
  }

  const totalPairs = packs.reduce((sum, pack) => sum + pack.pairs.length, 0);
  console.log(`Seeded ${packs.length} word packs and ${totalPairs} word pairs.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
