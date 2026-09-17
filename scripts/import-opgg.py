"""Normalize a saved public OP.GG comps HTML page. Usage: python scripts/import-opgg.py page.html
No requests run during builds. Keep source ratings and capture time distinct.
"""
import datetime, hashlib, json, re, sys
from pathlib import Path

html = Path(sys.argv[1]).read_text()
chunks = []
for script in re.findall(r'<script[^>]*>(.*?)</script>', html, re.S):
    prefix = 'self.__next_f.push('
    if script.startswith(prefix):
        try:
            value = json.loads(script[len(prefix):-1])
            if len(value) > 1 and isinstance(value[1], str):
                chunks.append(value[1])
        except (ValueError, TypeError):
            continue
flight = ''.join(chunks)
patch = re.search(r'"game_version":"([0-9.]+)"', flight).group(1)
if patch != '18.2':
    raise ValueError('Review the new patch before importing it: ' + patch)
if '"game_region":"global"' not in flight or '"game_tier":"ALL"' not in flight or '"game_mode":"ALL"' not in flight:
    raise ValueError('Unexpected source filters; review scope before import')
updated_label = re.search(r'Last updated: ([^"<]+)', flight).group(1)
decks = json.JSONDecoder().raw_decode(flight[flight.index('"decks":') + 8:])[0]
selected = [d for d in decks if d['stat']['opTier'] in ['OP', 'S', 'A']]
if not selected:
    raise ValueError('No top-tier decks found')
now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
aliases = {'Mama Beak': 'Crimson Raptor', 'Murkwolf': 'Murk Wolf', 'Scuttlecrab': 'Scuttle Crab', 'Brambleback': 'Red Brambleback', 'Sentinel': 'Blue Sentinel'}
lookup = {u['key']: aliases.get(u['meta']['name'], u['meta']['name']) for d in decks for u in d['units']}
base = 'https://op.gg/tft/meta-trends/comps'
records = []
articles = []
for rank, d in enumerate(selected, 1):
    def name(unit): return lookup[unit['key']]
    units = d['units']
    ordered = sorted([u for u in units if u['isCore']], key=lambda u: u['priority'] or 99)
    if not ordered: raise ValueError('Missing core for ' + d['id'])
    board = [{'unit': name(u), 'row': 4-u['cell']['y'], 'col': u['cell']['x']-1} for u in units if u.get('cell')]
    if len({(p['row'],p['col']) for p in board}) != len(board) or any(not (0<=p['row']<4 and 0<=p['col']<7) for p in board):
        raise ValueError('Invalid board: ' + d['id'])
    badge = {b['key']: b['value'] for b in d['badge']}
    reroll = badge.get('reroll')
    style = ('Reroll ' + str(reroll)) if reroll and reroll <= 7 else ('Fast ' + str(badge.get('tempo') or reroll)) if (badge.get('tempo') or reroll) else '来源未标注节奏 / Tempo unspecified'
    zh = d['name']['zh_CN'].replace('Elder Dragon','远古巨龙').replace('Scuttlecrab','峡谷迅捷蟹').replace('Pebbles','苍蓝哨戒')
    stages = []
    for label, field in [('Stage 2','early'),('Stage 3','middle')]:
        stage = d.get(field) or {}
        roster = stage.get('units',[])
        level = stage.get('level')
        if roster and level and len(roster) == int(level) and all(u['characterId'] in lookup for u in roster):
            text = 'OP.GG ' + str(level) + '人口过渡示例：' + ' / '.join(lookup[u['characterId']] for u in roster) + '。来源未给出固定回合或经济条件。'
        else:
            text = '来源未提供可核验的该阶段过渡方案；根据实际来牌保留经济，不把最终阵容当作固定过渡。'
        stages.append({'stage':label,'text':text})
    stages.append({'stage':'Stage 4','text':'来源最终阵容：' + ' / '.join(name(u) for u in units) + '。这是成型参考，来源未承诺必须在第四阶段完成。'})
    notes = ['来源评级：' + d['stat']['opTier'], '来源第一优先核心：'+name(ordered[0]), '榜单统计口径：全服务器 / 全段位 / ALL 模式；非 NA 专属。', '来源页面更新时间：'+updated_label+'；无法确认统计是否覆盖 9月14日热修，不能视为实时胜率。']
    # Core priority is not a role label. Do not invent tank assignments.
    if len(ordered)>1: notes.append('来源第二优先核心：'+name(ordered[1]))
    if reroll: notes.append('来源搜牌人口标记：'+str(reroll)+'。')
    notes.append('阵容码：'+d['teamCode'])
    item_focus = [name(u)+': '+ ' / '.join(i['name'].replace('Warmogs Armor',"Warmog's Armor").replace('Hand Of Justice','Hand of Justice') for i in u['itemMetas']) for u in units if u['itemMetas']]
    stat=d['stat']['label']
    stats={'sourceTier':d['stat']['opTier'],'sourceOrder':rank,'averagePlacement':stat['avgPlacement'],'winRate':stat['winRate'],'top4Rate':stat['top4Rate'],'pickRate':stat['pickRate'],'games':stat['compsCount'],'totalGames':stat['totalCount'],'capturedAt':now,'sourceUpdatedLabel':updated_label,'scope':'global / ALL tiers / ALL modes','statisticsBasis':'label','teamCode':d['teamCode']}
    rid='opgg-182-'+d['id']
    digest=hashlib.sha256(json.dumps(d,sort_keys=True).encode()).hexdigest()
    records.append({'id':rid,'sourceId':'opgg','articleId':rid,'articleTitle':d['name']['en_US']+' · OP.GG 18.2','articleUrl':base+'/'+d['id'],'publishedAt':'','updatedAt':'','contentHash':digest,'patch':patch,'name':d['name']['en_US'],'nameZh':zh,'tier':'S' if d['stat']['opTier']=='OP' else d['stat']['opTier'],'playstyle':style,'difficulty':{1:'EASY',2:'MEDIUM',3:'HARD'}.get(badge.get('difficulty'),'MEDIUM'),'coreUnits':[name(u) for u in ordered],'flexUnits':[name(u) for u in units if not u['isCore']],'itemFocus':item_focus,'traits':[t['meta']['name'] for t in d['traits'] if t['style']>0],'whenToPlay':'先核对主C来牌与推荐装备；来源'+('标注 '+str(reroll)+' 人口搜牌。' if reroll else '未标注固定搜牌人口。')+'排行榜评级不代表任意开局都适用。','keyNotes':notes,'stages':stages,'board':board,'positioningNote':('OP.GG 来源站位：前排在上、后排在下；按实际对手调整。' if board else '来源未提供最终站位。Builder 保留英雄名单，请手动放置；不把自动推导站位视作来源攻略。'),'gameMode':'TFT','ranking':stats})
    articles.append({'id':rid,'sourceId':'opgg','title':d['name']['en_US']+' · OP.GG 18.2','url':base+'/'+d['id'],'publishedAt':'','updatedAt':'','contentHash':digest,'status':'parsed','gameMode':'TFT'})
snapshot={'schemaVersion':1,'generatedAt':now,'sourceUrl':base,'officialPatchUrl':'https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-2/','sourceUpdatedLabel':updated_label,'scope':'global / ALL tiers / ALL modes','sourceStates':[{'sourceId':'opgg','status':'curated','lastCheckedAt':now,'lastChangedAt':None,'message':'已抓取 '+str(len(records))+' 套 OP/S/A 阵容；来源显示 '+updated_label+' 更新。统计是否覆盖9月14日热修未确认；手动快照，不是实时同步。'}],'articles':articles,'records':records}
Path('data/opgg-meta.generated.json').write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n')
print('Imported',len(records),'OP.GG comps for',patch,'at',now)
