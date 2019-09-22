import _ from 'lodash';
import CQ from '../CQcode';

const GAME_DATA = {};
const SCORE_DATA = {};

function answerGame(context, replyFunc) {
    const { message, group_id, user_id } = context;
    // 创建游戏
    if (message.startsWith('--question=') && message != '--question=') {
        let json = message.split('--question=')[1];
        try {
            json = JSON.parse(json);
            json.start = false;
            json.accept = false;
            json.current = -1;
        } catch (error) {
            replyFunc(context, 'JSON 格式有误\n' + error.toString());
            return true;
        }
        if (json.group) {
            GAME_DATA[json.group] = json;
            replyFunc(context, '问题添加成功');
        }
        return true;
    }
    // 进行游戏
    if (!group_id) return false;
    const game = GAME_DATA[group_id];
    if (!game) return false;
    if (!game.start) {
        // 还没开始
        if (user_id == game.qq && message == '--start') {
            game.start = true;
            SCORE_DATA[group_id] = {};
            replyFunc(context, '问答游戏开始啦！');
            return true;
        }
    } else {
        // 开始了
        if (user_id == game.qq) {
            if (message == '--exit') {
                game.start = false;
                replyFunc(context, '游戏已终止');
                return true;
            }
            if (message == '--next') {
                replyFunc(context, '请准备听题');
                setTimeout(() => {
                    replyFunc(context, nextQuestion(game));
                }, 5000);
                return true;
            }
        }
        // 回答问题
        const { questions, accept, current } = game;
        const score = SCORE_DATA[group_id];
        if (!accept || !/^[a-zA-Z]$/.exec(message)) return false;
        const answer = questions[current].answer;
        const userAnswer = message.toUpperCase().charCodeAt(0) - 65;
        if (answer == userAnswer) {
            game.accept = false;
            if (score[user_id]) score[user_id]++;
            else score[user_id] = 1;
            replyFunc(context, '回答正确，加一分！', true);
            // 游戏结束
            if (!questions[current + 1]) {
                game.start = false;
                replyFunc(context, '游戏结束');
                replyFunc(context, getScore(score));
            }
            return true;
        }
        return true;
    }
    return false;
}

function nextQuestion(game) {
    const q = game.questions[++game.current];
    let qStr = `问题${game.current + 1}：\n\n${q.question}\n`;
    q.options.forEach((v, i) => {
        qStr += `${String.fromCharCode(65 + i)}. ${v}`;
    });
    game.accept = true;
    return qStr;
}

function getScore(score) {
    const list = ['得分：'];
    _.toPairs(score)
        .sort((a, b) => (a[1] == b[1] ? a[0] - b[0] : b[1] - a[1]))
        .forEach(([qq, s]) => {
            list.push(CQ.at(qq) + s + '分');
        });
    return list.join('\n');
}

export default answerGame;
