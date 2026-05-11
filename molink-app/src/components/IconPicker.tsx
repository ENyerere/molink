import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import AnimatedPresence from './AnimatedPresence';
import {
  Search, Shuffle, X, Image as ImageIcon,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  RefreshCw, Repeat, Move,
  FileText, File, Folder, FolderOpen, BookOpen, Bookmark, Paperclip, Clipboard,
  Video, Music, Mic, Camera, Play, Headphones,
  Circle, Square, Triangle, Star, Heart, Diamond, Hexagon,
  Hash, AtSign, Link, Anchor, Flag, MapPin, Globe, Home,
  User, Users, Smile, Frown, Meh,
  Sun, Moon, Cloud, CloudRain, Zap, Flame, TreePine,
  Lightbulb, Key, Lock, Settings, Mail, Send, Bell, MessageSquare, Coffee, Gift,
  Check, AlertTriangle, Info, Calendar, Clock, Eye,
  Clock as ClockIcon, Leaf, Utensils, Plane, Lightbulb as BulbIcon,
  Hand, Carrot, Trophy, Map as MapIcon, Hash as HashIcon,
} from 'lucide-react';

/* ==================== CONFIG ==================== */
const COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6',
  '#ec4899','#6b7280','#1f2937','#78350f','#991b1b','#1e3a8a',
];
const SKIN_TONES = [
  { label: '默认', color: '#fbbf24' }, { label: '较浅', color: '#f5d0b0' },
  { label: '中等偏浅', color: '#e2b388' }, { label: '中等', color: '#c68642' },
  { label: '中等偏深', color: '#8d5524' }, { label: '较深', color: '#3c2e28' },
];

/* ==================== ICON DATA ==================== */
interface IconCategory { name: string; icons: string[]; }
const ICON_CATEGORIES: IconCategory[] = [
  { name: '箭头', icons: ['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','ArrowUpRight','ArrowDownRight','ChevronRight','ChevronLeft','ChevronUp','ChevronDown','RefreshCw','Shuffle'] },
  { name: '文件', icons: ['FileText','File','Folder','FolderOpen','BookOpen','Bookmark','Paperclip','Clipboard'] },
  { name: '多媒体', icons: ['ImageIcon','Video','Music','Mic','Camera','Play','Headphones'] },
  { name: '形状', icons: ['Circle','Square','Triangle','Star','Heart','Diamond','Hexagon'] },
  { name: '符号', icons: ['Hash','AtSign','Link','Anchor','Flag','MapPin','Globe','Home'] },
  { name: '人物', icons: ['User','Users','Smile','Frown','Meh'] },
  { name: '自然', icons: ['Sun','Moon','Cloud','CloudRain','Zap','Flame','TreePine'] },
  { name: '物品', icons: ['Lightbulb','Key','Lock','Settings','Mail','Send','Bell','MessageSquare','Coffee','Gift'] },
  { name: '其他', icons: ['Check','AlertTriangle','Info','Calendar','Clock','Eye'] },
];
export const ICON_MAP: Record<string, React.ElementType> = {
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, RefreshCw, Shuffle, Repeat, Move,
  FileText, File, Folder, FolderOpen, BookOpen, Bookmark, Paperclip, Clipboard,
  ImageIcon, Video, Music, Mic, Camera, Play, Headphones,
  Circle, Square, Triangle, Star, Heart, Diamond, Hexagon,
  Hash, AtSign, Link, Anchor, Flag, MapPin, Globe, Home,
  User, Users, Smile, Frown, Meh,
  Sun, Moon, Cloud, CloudRain, Zap, Flame, TreePine,
  Lightbulb, Key, Lock, Settings, Mail, Send, Bell, MessageSquare, Coffee, Gift,
  Check, AlertTriangle, Info, Calendar, Clock, Eye,
};

/* ==================== EMOJI DATA ==================== */
interface EmojiItem { char: string; category: string; keywords: string[]; skinTone?: boolean; }
function e(c: string, cat: string, kw: string, st?: boolean): EmojiItem {
  return { char: c, category: cat, keywords: kw.split(' ').filter(Boolean), skinTone: st };
}
const EMOJI_DATA: EmojiItem[] = [
  e('😀','人物','grinning face smile'), e('😃','人物','smile happy'), e('😄','人物','smile grin'), e('😁','人物','grin beam'),
  e('😆','人物','laugh happy'), e('😅','人物','sweat nervous'), e('🤣','人物','laugh rofl'), e('😂','人物','laugh joy tears'),
  e('🙂','人物','slight smile'), e('🙃','人物','upside down'), e('😉','人物','wink flirt'), e('😊','人物','blush smile'),
  e('😇','人物','halo angel'), e('🥰','人物','love heart'), e('😍','人物','heart eyes love'), e('🤩','人物','star eyes'),
  e('😘','人物','kiss heart'), e('😗','人物','kiss face'), e('😚','人物','kiss closed'), e('😙','人物','kiss smile'),
  e('😋','人物','yum tasty'), e('😛','人物','tongue silly'), e('😜','人物','wink tongue'), e('🤪','人物','zany crazy'),
  e('😝','人物','tongue squint'), e('🤑','人物','money rich'), e('🤗','人物','hug embrace'), e('🤭','人物','oops hand'),
  e('🤫','人物','shush quiet'), e('🤔','人物','think hmm'), e('🤐','人物','zip silent'), e('🤨','人物','raise eyebrow'),
  e('😐','人物','neutral face'), e('😑','人物','expressionless'), e('😶','人物','no mouth'), e('😏','人物','smirk'),
  e('😒','人物','unamused'), e('🙄','人物','roll eyes'), e('😬','人物','grimace'), e('🤥','人物','lying'),
  e('😌','人物','relieved'), e('😔','人物','pensive'), e('😪','人物','sleepy'), e('🤤','人物','drooling'),
  e('😴','人物','sleeping zzz'), e('😷','人物','mask sick'), e('🤒','人物','fever sick'), e('🤕','人物','bandage hurt'),
  e('🤢','人物','nauseated'), e('🤮','人物','vomit'), e('🤧','人物','sneeze'), e('🥵','人物','hot'),
  e('🥶','人物','cold freeze'), e('🥴','人物','woozy'), e('😵','人物','dizzy'), e('🤯','人物','mind blown'),
  e('🤠','人物','cowboy hat'), e('🥳','人物','party celebrate'), e('😎','人物','cool sunglasses'), e('🤓','人物','nerd glasses'),
  e('🧐','人物','monocle'), e('😕','人物','confused'), e('😟','人物','worried'), e('🙁','人物','slight frown'),
  e('☹️','人物','frown sad'), e('😮','人物','surprised wow'), e('😯','人物','hushed'), e('😲','人物','astonished'),
  e('😳','人物','flushed'), e('🥺','人物','pleading'), e('😦','人物','frown open'), e('😧','人物','anguished'),
  e('😨','人物','fearful'), e('😰','人物','anxious sweat'), e('😥','人物','sad relieved'), e('😢','人物','cry tear'),
  e('😭','人物','loudly crying'), e('😱','人物','scream horror'), e('😖','人物','confounded'), e('😣','人物','persevere'),
  e('😞','人物','disappointed'), e('😓','人物','downcast sweat'), e('😩','人物','weary'), e('😫','人物','tired'),
  e('🥱','人物','yawn'), e('😤','人物','triumph huff'), e('😡','人物','pout angry'), e('😠','人物','angry mad'),
  e('🤬','人物','cursing'), e('😈','人物','smiling devil'), e('👿','人物','angry devil'), e('💀','人物','skull dead'),
  e('☠️','人物','skull crossbones'), e('💩','人物','poop'), e('🤡','人物','clown'), e('👹','人物','ogre'),
  e('👺','人物','goblin'), e('👻','人物','ghost'), e('👽','人物','alien'), e('👾','人物','monster'),
  e('🤖','人物','robot'), e('😺','人物','cat smile'), e('😸','人物','cat grin'), e('😹','人物','cat tear'),
  e('😻','人物','cat love'), e('😼','人物','cat wry'), e('😽','人物','cat kiss'), e('🙀','人物','cat weary'),
  e('😿','人物','cat cry'), e('😾','人物','cat pout'),
  e('👋','手势','wave hand',true), e('🤚','手势','hand raised',true), e('🖐️','手势','hand fingers',true),
  e('✋','手势','hand stop',true), e('🖖','手势','vulcan spock',true), e('👌','手势','ok hand',true),
  e('🤏','手势','pinch small',true), e('✌️','手势','victory peace',true), e('🤞','手势','cross luck',true),
  e('🤟','手势','love you',true), e('🤘','手势','rock horns',true), e('🤙','手势','call me',true),
  e('👈','手势','point left',true), e('👉','手势','point right',true), e('👆','手势','point up',true),
  e('👇','手势','point down',true), e('☝️','手势','point index',true), e('👍','手势','thumbs up good',true),
  e('👎','手势','thumbs down bad',true), e('✊','手势','fist power',true), e('👊','手势','punch fist',true),
  e('🤛','手势','fist left',true), e('🤜','手势','fist right',true), e('👏','手势','clap praise',true),
  e('🙌','手势','raise hands',true), e('👐','手势','open hands',true), e('🤲','手势','palms together',true),
  e('🙏','手势','pray please',true), e('✍️','手势','write hand',true), e('💪','手势','muscle strong',true),
  e('🦾','手势','mechanical arm',true), e('🦿','手势','mechanical leg',true), e('🦵','手势','leg',true),
  e('🦶','手势','foot',true), e('👂','手势','ear',true), e('🦻','手势','ear aid',true),
  e('👃','手势','nose',true), e('🧠','手势','brain',true), e('🫀','手势','heart organ',true),
  e('🫁','手势','lungs',true), e('🦷','手势','tooth',true), e('🦴','手势','bone',true),
  e('👀','手势','eyes',true), e('👁️','手势','eye',true), e('👅','手势','tongue',true), e('👄','手势','mouth lips',true),
  e('🐶','自然','dog pet'), e('🐱','自然','cat pet'), e('🐭','自然','mouse animal'), e('🐹','自然','hamster pet'),
  e('🐰','自然','rabbit bunny'), e('🦊','自然','fox animal'), e('🐻','自然','bear animal'), e('🐼','自然','panda animal'),
  e('🐨','自然','koala animal'), e('🐯','自然','tiger animal'), e('🦁','自然','lion animal'), e('🐮','自然','cow animal'),
  e('🐷','自然','pig animal'), e('🐽','自然','pig nose'), e('🐸','自然','frog animal'), e('🐵','自然','monkey animal'),
  e('🙈','自然','see no evil'), e('🙉','自然','hear no evil'), e('🙊','自然','speak no evil'), e('🐒','自然','monkey'),
  e('🐔','自然','chicken bird'), e('🐧','自然','penguin bird'), e('🐦','自然','bird fly'), e('🐤','自然','chick baby'),
  e('🐣','自然','hatching chick'), e('🐥','自然','front chick'), e('🦆','自然','duck bird'), e('🦅','自然','eagle bird'),
  e('🦉','自然','owl bird'), e('🦇','自然','bat animal'), e('🐺','自然','wolf animal'), e('🐗','自然','boar animal'),
  e('🐴','自然','horse animal'), e('🦄','自然','unicorn'), e('🐝','自然','bee honey'), e('🐛','自然','bug insect'),
  e('🦋','自然','butterfly'), e('🐌','自然','snail'), e('🐞','自然','ladybug beetle'), e('🐜','自然','ant insect'),
  e('🦟','自然','mosquito'), e('🦗','自然','cricket'), e('🕷️','自然','spider'), e('🕸️','自然','web'),
  e('🦂','自然','scorpion'), e('🐢','自然','turtle'), e('🐍','自然','snake'), e('🦎','自然','lizard'),
  e('🦖','自然','t-rex dinosaur'), e('🦕','自然','sauropod dinosaur'), e('🐙','自然','octopus'), e('🦑','自然','squid'),
  e('🦐','自然','shrimp'), e('🦞','自然','lobster'), e('🦀','自然','crab'), e('🐡','自然','blowfish'),
  e('🐠','自然','tropical fish'), e('🐟','自然','fish'), e('🐬','自然','dolphin'), e('🐳','自然','whale spout'),
  e('🐋','自然','whale'), e('🦈','自然','shark'), e('🐊','自然','crocodile'), e('🐅','自然','tiger'),
  e('🐆','自然','leopard'), e('🦓','自然','zebra'), e('🦍','自然','gorilla'), e('🦧','自然','orangutan'),
  e('🐘','自然','elephant'), e('🦛','自然','hippopotamus'), e('🦏','自然','rhinoceros'), e('🐪','自然','camel'),
  e('🐫','自然','camel two'), e('🦒','自然','giraffe'), e('🦘','自然','kangaroo'), e('🐃','自然','water buffalo'),
  e('🐂','自然','ox'), e('🐄','自然','cow'), e('🐎','自然','horse'), e('🐖','自然','pig'),
  e('🐏','自然','ram'), e('🐑','自然','sheep'), e('🦙','自然','llama'), e('🐐','自然','goat'),
  e('🦌','自然','deer'), e('🐕','自然','dog'), e('🐩','自然','poodle'), e('🦮','自然','guide dog'),
  e('🐕‍🦺','自然','service dog'), e('🐈','自然','cat'), e('🐈‍⬛','自然','black cat'), e('🐓','自然','rooster'),
  e('🦃','自然','turkey'), e('🦚','自然','peacock'), e('🦜','自然','parrot'), e('🦢','自然','swan'),
  e('🦩','自然','flamingo'), e('🕊️','自然','dove'), e('🐇','自然','rabbit'), e('🦝','自然','raccoon'),
  e('🦨','自然','skunk'), e('🦡','自然','badger'), e('🦦','自然','otter'), e('🦥','自然','sloth'),
  e('🐁','自然','mouse'), e('🐀','自然','rat'), e('🐿️','自然','chipmunk'), e('🦔','自然','hedgehog'),
  e('🍎','食物','apple fruit'), e('🍐','食物','pear fruit'), e('🍊','食物','orange fruit'), e('🍋','食物','lemon fruit'),
  e('🍌','食物','banana fruit'), e('🍉','食物','watermelon fruit'), e('🍇','食物','grape fruit'), e('🍓','食物','strawberry fruit'),
  e('🫐','食物','blueberry fruit'), e('🍈','食物','melon fruit'), e('🍒','食物','cherry fruit'), e('🍑','食物','peach fruit'),
  e('🥭','食物','mango fruit'), e('🍍','食物','pineapple fruit'), e('🥥','食物','coconut fruit'), e('🥝','食物','kiwi fruit'),
  e('🍅','食物','tomato vegetable'), e('🥑','食物','avocado fruit'), e('🍆','食物','eggplant vegetable'), e('🥔','食物','potato vegetable'),
  e('🥕','食物','carrot vegetable'), e('🌽','食物','corn'), e('🌶️','食物','hot pepper'), e('🫑','食物','bell pepper'),
  e('🥒','食物','cucumber'), e('🥬','食物','leafy green'), e('🥦','食物','broccoli'), e('🧄','食物','garlic'),
  e('🧅','食物','onion'), e('🍄','食物','mushroom'), e('🥜','食物','peanut'), e('🌰','食物','chestnut'),
  e('🍞','食物','bread'), e('🥐','食物','croissant'), e('🥖','食物','baguette'), e('🥨','食物','pretzel'),
  e('🥯','食物','bagel'), e('🥞','食物','pancakes'), e('🧇','食物','waffle'), e('🧀','食物','cheese'),
  e('🍖','食物','meat bone'), e('🍗','食物','poultry leg'), e('🥩','食物','cut meat'), e('🥓','食物','bacon'),
  e('🍔','食物','hamburger'), e('🍟','食物','fries'), e('🍕','食物','pizza'), e('🌭','食物','hot dog'),
  e('🥪','食物','sandwich'), e('🌮','食物','taco'), e('🌯','食物','burrito'), e('🫔','食物','tamale'),
  e('🥙','食物','stuffed flatbread'), e('🧆','食物','falafel'), e('🥚','食物','egg'), e('🍳','食物','cooking'),
  e('🥘','食物','paella'), e('🍲','食物','pot food'), e('🫕','食物','fondue'), e('🥣','食物','bowl spoon'),
  e('🥗','食物','salad green'), e('🍿','食物','popcorn'), e('🧈','食物','butter'), e('🧂','食物','salt'),
  e('🥫','食物','canned food'), e('🍱','食物','bento box'), e('🍘','食物','rice cracker'), e('🍙','食物','rice ball'),
  e('🍚','食物','rice'), e('🍛','食物','curry rice'), e('🍜','食物','ramen noodle'), e('🍝','食物','spaghetti'),
  e('🍠','食物','sweet potato'), e('🍢','食物','oden'), e('🍣','食物','sushi'), e('🍤','食物','fried shrimp'),
  e('🍥','食物','fish cake'), e('🥮','食物','moon cake'), e('🍡','食物','dango'), e('🥟','食物','dumpling'),
  e('🥠','食物','fortune cookie'), e('🥡','食物','takeout box'), e('🦪','食物','oyster'), e('🍦','食物','ice cream'),
  e('🍧','食物','shaved ice'), e('🍨','食物','ice cream bowl'), e('🍩','食物','doughnut'), e('🍪','食物','cookie'),
  e('🎂','食物','birthday cake'), e('🍰','食物','shortcake'), e('🧁','食物','cupcake'), e('🥧','食物','pie'),
  e('🍫','食物','chocolate'), e('🍬','食物','candy'), e('🍭','食物','lollipop'), e('🍮','食物','custard'),
  e('🍯','食物','honey pot'), e('🍼','食物','baby bottle'), e('🥛','食物','milk glass'), e('☕','食物','coffee tea'),
  e('🫖','食物','teapot'), e('🍵','食物','tea cup'), e('🍶','食物','sake'), e('🍾','食物','champagne'),
  e('🍷','食物','wine glass'), e('🍸','食物','cocktail'), e('🍹','食物','tropical drink'), e('🍺','食物','beer mug'),
  e('🍻','食物','clink beer'), e('🥂','食物','clink glasses'), e('🥃','食物','tumbler'), e('🥤','食物','cup straw'),
  e('🧋','食物','bubble tea'), e('🧃','食物','juice box'), e('🧉','食物','mate'), e('🧊','食物','ice'),
  e('⚽','活动','soccer football'), e('🏀','活动','basketball sport'), e('🏈','活动','football american'), e('⚾','活动','baseball sport'),
  e('🥎','活动','softball'), e('🎾','活动','tennis sport'), e('🏐','活动','volleyball sport'), e('🏉','活动','rugby sport'),
  e('🥏','活动','flying disc'), e('🎱','活动','pool billiard'), e('🪀','活动','yo-yo'), e('🏓','活动','pingpong table'),
  e('🏸','活动','badminton sport'), e('🏒','活动','hockey ice'), e('🏑','活动','hockey field'), e('🥍','活动','lacrosse sport'),
  e('🏏','活动','cricket sport'), e('🥅','活动','goal net'), e('⛳','活动','golf flag'), e('🏹','活动','archery bow'),
  e('🎣','活动','fishing pole'), e('🤿','活动','diving mask'), e('🥊','活动','boxing glove'), e('🥋','活动','martial arts'),
  e('🎽','活动','running shirt'), e('🛹','活动','skateboard'), e('🛷','活动','sled'), e('⛸️','活动','ice skate'),
  e('🥌','活动','curling stone'), e('🎿','活动','skis'), e('⛷️','活动','skier'), e('🏂','活动','snowboarder'),
  e('🪂','活动','parachute'), e('🏋️','活动','weight lift'), e('🤼','活动','wrestle'), e('🤸','活动','cartwheel'),
  e('⛹️','活动','basketball person'), e('🤺','活动','fencing'), e('🤾','活动','handball'), e('🏌️','活动','golf person'),
  e('🏇','活动','horse race'), e('🧘','活动','yoga meditate'), e('🏄','活动','surf'), e('🏊','活动','swim'),
  e('🤽','活动','water polo'), e('🚣','活动','row boat'), e('🧗','活动','climb'), e('🚵','活动','mountain bike'),
  e('🚴','活动','bike bicycle'), e('🏆','活动','trophy'), e('🥇','活动','gold medal'), e('🥈','活动','silver medal'),
  e('🥉','活动','bronze medal'), e('🏅','活动','sports medal'), e('🎖️','活动','military medal'), e('🏵️','活动','rosette'),
  e('🎗️','活动','reminder ribbon'), e('🎫','活动','ticket'), e('🎟️','活动','admission ticket'), e('🎪','活动','circus tent'),
  e('🤹','活动','juggle'), e('🎭','活动','performing arts'), e('🩰','活动','ballet shoes'), e('🎨','活动','art palette'),
  e('🎬','活动','clapper board'), e('🎤','活动','microphone mic'), e('🎧','活动','headphone music'), e('🎼','活动','musical score'),
  e('🎹','活动','piano music'), e('🥁','活动','drum'), e('🎷','活动','saxophone'), e('🎺','活动','trumpet'),
  e('🎸','活动','guitar music'), e('🪕','活动','banjo'), e('🎻','活动','violin'), e('🎲','活动','game die'),
  e('♟️','活动','chess pawn'), e('🎯','活动','dart target'), e('🎳','活动','bowling'), e('🎮','活动','video game'),
  e('🎰','活动','slot machine'), e('🧩','活动','puzzle'),
  e('🚗','旅行','car auto'), e('🚕','旅行','taxi'), e('🚙','旅行','suv'), e('🚌','旅行','bus'),
  e('🚎','旅行','trolleybus'), e('🏎️','旅行','racing car'), e('🚓','旅行','police car'), e('🚑','旅行','ambulance'),
  e('🚒','旅行','fire engine'), e('🚐','旅行','minibus'), e('🚚','旅行','delivery truck'), e('🚛','旅行','articulated lorry'),
  e('🚜','旅行','tractor'), e('🦯','旅行','probing cane'), e('🦽','旅行','manual wheelchair'), e('🦼','旅行','motor wheelchair'),
  e('🛴','旅行','kick scooter'), e('🚲','旅行','bike bicycle'), e('🛵','旅行','motor scooter'), e('🏍️','旅行','motorcycle'),
  e('🛺','旅行','auto rickshaw'), e('🚨','旅行','police light'), e('🚔','旅行','oncoming police'), e('🚍','旅行','oncoming bus'),
  e('🚘','旅行','oncoming auto'), e('🚖','旅行','oncoming taxi'), e('🚡','旅行','aerial tramway'), e('🚠','旅行','mountain cableway'),
  e('🚟','旅行','suspension railway'), e('🚃','旅行','railway car'), e('🚋','旅行','tram car'), e('🚞','旅行','mountain railway'),
  e('🚝','旅行','monorail'), e('🚄','旅行','high speed train'), e('🚅','旅行','bullet train'), e('🚈','旅行','light rail'),
  e('🚂','旅行','locomotive steam'), e('🚆','旅行','train'), e('🚇','旅行','metro subway'), e('🚊','旅行','tram'),
  e('🚉','旅行','station'), e('✈️','旅行','airplane plane'), e('🛫','旅行','departure'), e('🛬','旅行','arrival'),
  e('🛩️','旅行','small airplane'), e('💺','旅行','seat'), e('🛰️','旅行','satellite'), e('🚀','旅行','rocket space'),
  e('🛸','旅行','ufo flying saucer'), e('🚁','旅行','helicopter'), e('🛶','旅行','canoe'), e('⛵','旅行','sailboat'),
  e('🚤','旅行','speedboat'), e('🛥️','旅行','motor boat'), e('🛳️','旅行','passenger ship'), e('⛴️','旅行','ferry'),
  e('🚢','旅行','ship'), e('⚓','旅行','anchor'), e('⛽','旅行','fuel pump'), e('🚧','旅行','construction'),
  e('🚦','旅行','vertical traffic light'), e('🚥','旅行','horizontal traffic light'), e('🚏','旅行','bus stop'),
  e('🗿','旅行','moai statue'), e('🗽','旅行','statue liberty'), e('🗼','旅行','tokyo tower'),
  e('🏰','旅行','castle europe'), e('🏯','旅行','castle japan'), e('🏟️','旅行','stadium'), e('🎡','旅行','ferris wheel'),
  e('🎢','旅行','roller coaster'), e('🎠','旅行','carousel'), e('⛲','旅行','fountain'), e('⛱️','旅行','umbrella beach'),
  e('🏖️','旅行','beach'), e('🏝️','旅行','desert island'), e('🏜️','旅行','desert'), e('🌋','旅行','volcano'),
  e('⛰️','旅行','mountain'), e('🏔️','旅行','snow mountain'), e('🗻','旅行','mount fuji'), e('🏕️','旅行','camping'),
  e('⛺','旅行','tent'), e('🏠','旅行','house'), e('🏡','旅行','house garden'), e('🏘️','旅行','houses'),
  e('🏚️','旅行','derelict house'), e('🏗️','旅行','construction building'), e('🏭','旅行','factory'), e('🏢','旅行','office building'),
  e('🏬','旅行','department store'), e('🏣','旅行','post office japan'), e('🏤','旅行','post office'), e('🏥','旅行','hospital'),
  e('🏦','旅行','bank'), e('🏨','旅行','hotel'), e('🏩','旅行','love hotel'), e('🏪','旅行','convenience store'),
  e('🏫','旅行','school'), e('🎓','旅行','graduation cap'), e('🏛️','旅行','classical building'), e('⛪','旅行','church'),
  e('🕌','旅行','mosque'), e('🛕','旅行','hindu temple'), e('🕍','旅行','synagogue'), e('⛩️','旅行','shinto shrine'),
  e('🕋','旅行','kaaba'), e('⛲','旅行','fountain'), e('🌁','旅行','foggy'), e('🌃','旅行','night stars'),
  e('🏙️','旅行','cityscape'), e('🌄','旅行','sunrise mountain'), e('🌅','旅行','sunrise'), e('🌆','旅行','city dusk'),
  e('🌇','旅行','sunset'), e('🌉','旅行','bridge night'),
  e('⌚','物品','watch time'), e('📱','物品','phone mobile'), e('📲','物品','call mobile'),
  e('💻','物品','laptop computer'), e('⌨️','物品','keyboard type'), e('🖥️','物品','desktop computer'),
  e('🖨️','物品','printer paper'), e('🖱️','物品','mouse click'), e('🖲️','物品','trackball'),
  e('🕹️','物品','joystick game'), e('🗜️','物品','clamp tool'), e('💽','物品','disk minidisc'),
  e('💾','物品','floppy disk'), e('💿','物品','cd disc'), e('📀','物品','dvd disc'),
  e('📼','物品','vhs tape'), e('📷','物品','camera photo'), e('📸','物品','camera flash'),
  e('📹','物品','video camera'), e('🎥','物品','movie film'), e('📽️','物品','projector film'),
  e('🎞️','物品','film frames'), e('📞','物品','telephone receiver'), e('☎️','物品','telephone phone'),
  e('📟','物品','pager'), e('📠','物品','fax machine'), e('📺','物品','tv television'),
  e('📻','物品','radio'), e('🎙️','物品','studio microphone'), e('🎚️','物品','level slider'),
  e('🎛️','物品','control knobs'), e('🧭','物品','compass'), e('⏱️','物品','stopwatch'),
  e('⏲️','物品','timer clock'), e('⏰','物品','alarm clock'), e('🕰️','物品','mantelpiece clock'),
  e('⌛','物品','hourglass done'), e('⏳','物品','hourglass not'), e('📡','物品','satellite antenna'),
  e('🔋','物品','battery'), e('🔌','物品','electric plug'), e('💡','物品','light bulb idea'),
  e('🔦','物品','flashlight'), e('🕯️','物品','candle'), e('🪔','物品','diya lamp'),
  e('🧯','物品','fire extinguisher'), e('🛢️','物品','oil drum'), e('💸','物品','money wings'),
  e('💵','物品','dollar money'), e('💴','物品','yen money'), e('💶','物品','euro money'),
  e('💷','物品','pound money'), e('💰','物品','money bag'), e('💳','物品','credit card'),
  e('🧾','物品','receipt'), e('💎','物品','gem stone'), e('⚖️','物品','balance scale'),
  e('🦯','物品','white cane'), e('🧰','物品','toolbox'), e('🔧','物品','wrench tool'),
  e('🔨','物品','hammer tool'), e('⚒️','物品','hammer pick'), e('🛠️','物品','hammer wrench'),
  e('⛏️','物品','pick'), e('🔩','物品','nut bolt'), e('⚙️','物品','gear'),
  e('🗜️','物品','clamp vice'), e('⚗️','物品','alembic'), e('⚖️','物品','balance'),
  e('🧲','物品','magnet'), e('🧪','物品','test tube'), e('🧫','物品','petri dish'),
  e('🧬','物品','dna'), e('🔬','物品','microscope'), e('🔭','物品','telescope'),
  e('📡','物品','satellite dish'), e('💉','物品','syringe vaccine'), e('🩸','物品','drop blood'),
  e('💊','物品','pill medicine'), e('🩹','物品','adhesive bandage'), e('🩺','物品','stethoscope'),
  e('🚪','物品','door'), e('🛗','物品','elevator'), e('🪞','物品','mirror'),
  e('🪟','物品','window'), e('🛏️','物品','bed'), e('🛋️','物品','couch lamp'),
  e('🪑','物品','chair'), e('🚽','物品','toilet'), e('🪠','物品','plunger'),
  e('🚿','物品','shower'), e('🛁','物品','bathtub'), e('🪤','物品','mouse trap'),
  e('🪒','物品','razor'), e('🧴','物品','lotion bottle'), e('🧷','物品','safety pin'),
  e('🧹','物品','broom'), e('🧺','物品','basket'), e('🧻','物品','roll paper'),
  e('🧼','物品','soap'), e('🧽','物品','sponge'), e('🧯','物品','extinguisher'),
  e('🛒','物品','shopping cart'), e('🚬','物品','cigarette smoke'), e('⚰️','物品','coffin'),
  e('⚱️','物品','funeral urn'), e('🗿','物品','moai'),
  e('💌','符号','love letter'), e('💘','符号','heart arrow'), e('💝','符号','heart ribbon'),
  e('💖','符号','sparkling heart'), e('💗','符号','growing heart'), e('💓','符号','beating heart'),
  e('💞','符号','revolving hearts'), e('💕','符号','two hearts'), e('💟','符号','heart decoration'),
  e('❣️','符号','heart exclamation'), e('💔','符号','broken heart'), e('❤️','符号','red heart'),
  e('🧡','符号','orange heart'), e('💛','符号','yellow heart'), e('💚','符号','green heart'),
  e('💙','符号','blue heart'), e('💜','符号','purple heart'), e('🤎','符号','brown heart'),
  e('🖤','符号','black heart'), e('🤍','符号','white heart'), e('💯','符号','hundred points'),
  e('💢','符号','anger'), e('💥','符号','collision boom'), e('💫','符号','dizzy star'),
  e('💦','符号','sweat droplets'), e('💨','符号','dash wind'), e('🕳️','符号','hole'),
  e('💣','符号','bomb'), e('💬','符号','speech balloon'), e('👁️‍🗨️','符号','eye speech'),
  e('🗨️','符号','left speech'), e('🗯️','符号','right anger'), e('💭','符号','thought balloon'),
  e('💤','符号','zzz sleep'), e('🔥','符号','fire flame'), e('✨','符号','sparkles stars'),
  e('🌟','符号','glowing star'), e('⭐','符号','star'), e('🌠','符号','shooting star'),
  e('🌈','符号','rainbow'), e('☀️','符号','sun sunny'), e('⛅','符号','sun behind cloud'),
  e('☁️','符号','cloud'), e('⛈️','符号','cloud lightning rain'), e('🌤️','符号','sun small cloud'),
  e('🌥️','符号','sun big cloud'), e('🌦️','符号','sun rain cloud'), e('🌧️','符号','cloud rain'),
  e('🌨️','符号','cloud snow'), e('❄️','符号','snowflake'), e('🌬️','符号','wind face'),
  e('💨','符号','dash blow'), e('🌪️','符号','tornado'), e('🌫️','符号','fog'),
  e('☔','符号','umbrella rain'), e('☂️','符号','umbrella'), e('⚡','符号','high voltage zap'),
  e('❄️','符号','snowflake cold'), e('☃️','符号','snowman'), e('⛄','符号','snowman no snow'),
  e('☄️','符号','comet'), e('🔥','符号','fire hot'), e('💧','符号','droplet water'),
  e('🌊','符号','wave ocean'), e('🎄','符号','christmas tree'), e('✨','符号','sparkle shine'),
  e('🎋','符号','tanabata tree'), e('🎍','符号','pine decoration'), e('🎑','符号','moon viewing'),
  e('💫','符号','dizzy'), e('⭐','符号','star shiny'),
];

export function parseIcon(icon: string | null | undefined) {
  if (!icon) return { type: 'none' as const, value: '', color: null as string | null };
  if (icon.startsWith('url:')) return { type: 'url' as const, value: icon.slice(4), color: null };
  if (icon.startsWith('lucide:')) {
    const parts = icon.split(':');
    return { type: 'lucide' as const, value: parts[1], color: parts[2] || null };
  }
  return { type: 'emoji' as const, value: icon, color: null };
}
function saveRecent(type: 'icon' | 'emoji', value: string) {
  const key = type === 'icon' ? 'molink:recent-icons' : 'molink:recent-emojis';
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as string[];
    const filtered = existing.filter(v => v !== value);
    localStorage.setItem(key, JSON.stringify([value, ...filtered].slice(0, 10)));
  } catch {}
}
function getRecent(type: 'icon' | 'emoji'): string[] {
  const key = type === 'icon' ? 'molink:recent-icons' : 'molink:recent-emojis';
  try { return (JSON.parse(localStorage.getItem(key) || '[]') as string[]).slice(0, 10); } catch { return []; }
}
function applySkinTone(emoji: string, toneIndex: number): string {
  if (toneIndex <= 0) return emoji;
  const modifiers = ['\u{1F3FB}','\u{1F3FC}','\u{1F3FD}','\u{1F3FE}','\u{1F3FF}'];
  return emoji + modifiers[toneIndex - 1];
}

/* ==================== COMPONENT ==================== */
type TabType = 'emoji' | 'icon' | 'upload';
interface IconPickerProps {
  isOpen: boolean; onClose: () => void; onSelect: (icon: string | null) => void; currentIcon?: string | null;
  anchorRef?: React.RefObject<HTMLElement | null>;
}
const EMOJI_CAT_NAV = [
  { name: '人物', icon: ClockIcon }, { name: '手势', icon: Hand }, { name: '自然', icon: Leaf },
  { name: '食物', icon: Carrot }, { name: '活动', icon: Trophy }, { name: '旅行', icon: MapIcon },
  { name: '物品', icon: BulbIcon }, { name: '符号', icon: HashIcon },
];

export default function IconPicker({ isOpen, onClose, onSelect, currentIcon, anchorRef }: IconPickerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('emoji');
  const [search, setSearch] = useState('');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [askEveryTime, setAskEveryTime] = useState(false);
  const [pickingColorFor, setPickingColorFor] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const computePosition = useCallback(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const pickerWidth = 380;
    const pickerHeight = 380;
    const margin = 8;
    let left = rect.left;
    let top = rect.bottom + margin;
    // 防止超出右边界
    if (left + pickerWidth > window.innerWidth - margin) {
      left = window.innerWidth - pickerWidth - margin;
    }
    // 防止超出下边界（上方展开）
    if (top + pickerHeight > window.innerHeight - margin) {
      top = rect.top - pickerHeight - margin;
    }
    // 防止超出上边界
    if (top < margin) top = margin;
    setPosition({ top, left });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    computePosition();
  }, [isOpen, computePosition]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('resize', computePosition);
    return () => window.removeEventListener('resize', computePosition);
  }, [isOpen, computePosition]);

  useEffect(() => {
    if (isOpen) {
      const parsed = parseIcon(currentIcon);
      if (parsed.type === 'lucide') { setActiveTab('icon'); if (parsed.color) setSelectedColor(parsed.color); }
      else if (parsed.type === 'url') { setActiveTab('upload'); setUploadedImage(parsed.value); }
      else { setActiveTab('emoji'); }
      setSearch(''); setPickingColorFor(null);
    }
  }, [isOpen, currentIcon]);

  // No body scroll lock needed — picker is a popover, not a fullscreen overlay

  useEffect(() => { if (isOpen) setTimeout(() => searchInputRef.current?.focus(), 100); }, [isOpen, activeTab]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
        onClose();
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'upload') return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) { const r = new FileReader(); r.onload = (ev) => setUploadedImage(ev.target?.result as string); r.readAsDataURL(file); }
            return;
          }
        }
      }
      const text = e.clipboardData?.getData('text');
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) setUploadedImage(text);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [isOpen, activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSelectEmoji = (emoji: string) => {
    saveRecent('emoji', emoji); onSelect(emoji);
  };

  const handleSelectIcon = (iconName: string) => {
    const value = selectedColor ? `lucide:${iconName}:${selectedColor}` : `lucide:${iconName}`;
    saveRecent('icon', value); onSelect(value);
  };

  const handleClickIcon = (iconName: string) => {
    if (selectedColor) { handleSelectIcon(iconName); }
    else { setPickingColorFor(iconName); }
  };

  const handlePickIconColor = (color: string | null) => {
    if (!pickingColorFor) return;
    const value = color ? `lucide:${pickingColorFor}:${color}` : `lucide:${pickingColorFor}`;
    saveRecent('icon', value); onSelect(value); setPickingColorFor(null);
  };

  const handleRandom = () => {
    if (activeTab === 'emoji') {
      handleSelectEmoji(EMOJI_DATA[Math.floor(Math.random() * EMOJI_DATA.length)].char);
    } else if (activeTab === 'icon') {
      const allIcons = ICON_CATEGORIES.flatMap(c => c.icons);
      handleClickIcon(allIcons[Math.floor(Math.random() * allIcons.length)]);
    }
  };

  const handleRemove = () => { onSelect(null); };
  const handleSaveUpload = () => { if (uploadedImage) onSelect(`url:${uploadedImage}`); };

  const scrollToCategory = (name: string) => {
    const el = document.getElementById(`emoji-cat-${name}`);
    if (el && contentRef.current) {
      const container = contentRef.current;
      const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 8;
      container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  };

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return EMOJI_DATA;
    const s = search.toLowerCase();
    return EMOJI_DATA.filter(e => e.keywords.some(k => k.includes(s)) || e.category.toLowerCase().includes(s));
  }, [search]);

  const filteredIcons = useMemo(() => {
    const allIcons = ICON_CATEGORIES.flatMap(c => c.icons);
    if (!search.trim()) return [{ name: '所有图标', icons: allIcons }];
    const s = search.toLowerCase();
    const filtered = allIcons.filter(name => name.toLowerCase().includes(s));
    return filtered.length > 0 ? [{ name: '所有图标', icons: filtered }] : [];
  }, [search]);

  const recentEmojis = getRecent('emoji');
  const recentIcons = getRecent('icon');
  const emojiCategories = useMemo(() => Array.from(new Set(filteredEmojis.map(e => e.category))), [filteredEmojis]);

  return (
    <AnimatedPresence
      show={isOpen}
      duration={150}
      enterFrom="opacity-0"
      enterTo="opacity-100"
    >
    <div className="fixed inset-0 z-[100]">
      {/* 遮罩层 — 阻止点击穿透，点击后关闭 */}
      <div className="absolute inset-0" onClick={onClose} />
      {/* Picker 卡片 */}
      <div
        ref={pickerRef}
        className="absolute bg-card rounded-lg w-[380px] max-w-[90vw] shadow-2xl border border-border flex flex-col max-h-[380px] overflow-hidden transition-transform duration-150 ease-out"
        style={{
          top: position.top,
          left: position.left,
          transform: isOpen ? 'scale(1)' : 'scale(0.97)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-0 shrink-0">
          <div className="flex items-center gap-5">
            {(['emoji','icon','upload'] as TabType[]).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setSearch(''); setUploadedImage(null); setPickingColorFor(null); }}
                className={`pb-2 text-[13px] transition-colors relative ${activeTab === tab ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab === 'emoji' && '表情符号'}{tab === 'icon' && '图标'}{tab === 'upload' && '上传'}
                {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground rounded-full" />}
              </button>
            ))}
          </div>
          <button onClick={handleRemove} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors pb-2">移除</button>
        </div>

        {/* Search */}
        {activeTab !== 'upload' && (
        <div className="px-3 py-2.5 flex items-center gap-1.5 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input ref={searchInputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="筛选..."
              className="w-full h-8 pl-8 pr-3 bg-muted rounded-md text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus:ring-1 focus:ring-primary/50" />
          </div>
          <button onClick={handleRandom} className="w-8 h-8 flex items-center justify-center rounded-md bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="随机">
            <Shuffle className="w-3.5 h-3.5" />
          </button>
          {activeTab === 'icon' && (
            <div className="relative">
              <button onClick={() => { setShowColorPicker(v => !v); }}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="选择颜色">
                <div className="w-3.5 h-3.5 rounded-full border border-border" style={{ backgroundColor: selectedColor || '#6b7280' }} />
              </button>
              {showColorPicker && (
                <div className="absolute right-0 top-full mt-1.5 bg-card rounded-lg shadow-xl border border-border p-2.5 z-50 w-[180px]">
                  <div className="grid grid-cols-6 gap-1">
                    {COLORS.map(color => (
                      <button key={color} onClick={() => { setSelectedColor(color); setShowColorPicker(false); }}
                        className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-foreground ring-offset-1 ring-offset-card' : ''}`}
                        style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
        )}

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
          {activeTab === 'emoji' && (
            <div>
              {recentEmojis.length > 0 && !search && (
                <div className="mb-3">
                  <div className="text-[11px] text-muted-foreground mb-1.5 font-medium">最近</div>
                  <div className="flex flex-wrap gap-0.5">
                    {recentEmojis.map((emoji, i) => (
                      <button key={`r-${i}`} onClick={() => onSelect(emoji)} className="w-8 h-8 flex items-center justify-center text-lg hover:bg-accent rounded transition-colors">{emoji}</button>
                    ))}
                  </div>
                </div>
              )}
              {emojiCategories.map(cat => (
                <div key={cat} className="mb-3" id={`emoji-cat-${cat}`}>
                  <div className="text-[11px] text-muted-foreground mb-1.5 font-medium">{cat}</div>
                  <div className="flex flex-wrap gap-0.5">
                    {filteredEmojis.filter(e => e.category === cat).map((item, i) => {
                      return <button key={`${cat}-${i}`} onClick={() => handleSelectEmoji(item.char)} className="w-8 h-8 flex items-center justify-center text-lg hover:bg-accent rounded transition-colors">{item.char}</button>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'icon' && (
            <div>
              {pickingColorFor && (
                <div className="mb-3 pb-3 border-b border-border">
                  <div className="text-[11px] text-muted-foreground mb-1.5 font-medium">选择颜色</div>
                  <div className="flex flex-wrap gap-0.5">
                    {(() => { const IconComp = ICON_MAP[pickingColorFor]; if (!IconComp) return null;
                      return (<>
                        <button onClick={() => handlePickIconColor(null)} className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded transition-colors" title="默认"><IconComp className="w-5 h-5 text-muted-foreground" /></button>
                        {COLORS.map(color => <button key={color} onClick={() => handlePickIconColor(color)} className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded transition-colors"><IconComp className="w-5 h-5" style={{ color }} /></button>)}
                      </>);
                    })()}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-muted-foreground">每次询问</span>
                    <button onClick={() => setAskEveryTime(v => !v)} className={`w-9 h-4.5 rounded-full transition-colors relative ${askEveryTime ? 'bg-primary' : 'bg-muted'}`}>
                      <span className={`absolute top-0.5 w-3.5 h-3.5 bg-primary-foreground rounded-full transition-transform ${askEveryTime ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              )}
              {!pickingColorFor && recentIcons.length > 0 && !search && (
                <div className="mb-3">
                  <div className="text-[11px] text-muted-foreground mb-1.5 font-medium">最近</div>
                  <div className="flex flex-wrap gap-0.5">
                    {recentIcons.map((iconVal, i) => {
                      const parsed = parseIcon(iconVal); const IconComp = parsed.type === 'lucide' ? ICON_MAP[parsed.value] : null;
                      return IconComp ? <button key={`r-${i}`} onClick={() => onSelect(iconVal)} className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded transition-colors"><IconComp className="w-5 h-5" style={{ color: parsed.color || 'currentColor' }} /></button> : null;
                    })}
                  </div>
                </div>
              )}
              {filteredIcons.map(cat => (
                <div key={cat.name} className="mb-3">
                  <div className="text-[11px] text-muted-foreground mb-1.5 font-medium">{cat.name}</div>
                  <div className="flex flex-wrap gap-0.5">
                    {cat.icons.map((iconName, i) => { const IconComp = ICON_MAP[iconName]; if (!IconComp) return null;
                      return <button key={`${cat.name}-${i}`} onClick={() => handleClickIcon(iconName)} className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded transition-colors"><IconComp className="w-5 h-5" style={{ color: selectedColor || 'hsl(var(--muted-foreground))' }} /></button>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="flex flex-col gap-3">
              <div onClick={() => fileInputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file && file.type.startsWith('image/')) { const r = new FileReader(); r.onload = (ev) => setUploadedImage(ev.target?.result as string); r.readAsDataURL(file); }}}
                className="border border-dashed border-border rounded-md p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 transition-colors">
                {uploadedImage ? <img src={uploadedImage} alt="预览" className="max-h-28 max-w-full rounded object-contain" /> : <><ImageIcon className="w-6 h-6 text-muted-foreground" /><span className="text-[13px] text-muted-foreground">上传图片</span></>}
              </div>
              <p className="text-[11px] text-muted-foreground text-center">或 Ctrl+V 粘贴图片或链接</p>
              {uploadedImage && (
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setUploadedImage(null)} className="px-3 py-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors">取消</button>
                  <button onClick={handleSaveUpload} className="px-3 py-1 text-[13px] bg-primary text-primary-foreground rounded hover:opacity-90 transition-colors">保存</button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>
          )}
        </div>

        {/* Bottom nav */}
        {activeTab === 'emoji' && !search && (
          <div className="shrink-0 border-t border-border px-2 py-1.5 grid grid-cols-8 place-items-center">
            {EMOJI_CAT_NAV.map(cat => {
              const NavIcon = cat.icon;
              return <button key={cat.name} onClick={() => scrollToCategory(cat.name)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title={cat.name}><NavIcon className="w-3.5 h-3.5" /></button>;
            })}
          </div>
        )}
      </div>
    </div>
    </AnimatedPresence>
  );
}

/* ==================== SHARED RENDERER ==================== */
export function PageIcon({ icon, size = 20, className = '' }: { icon: string | null | undefined; size?: number; className?: string }) {
  const parsed = parseIcon(icon);
  if (parsed.type === 'emoji') return <span className={`flex items-center justify-center leading-none ${className}`} style={{ fontSize: size, width: size, height: size }}>{parsed.value}</span>;
  if (parsed.type === 'lucide') { const IconComp = ICON_MAP[parsed.value]; if (!IconComp) return null; return <IconComp className={`flex-shrink-0 ${className}`} style={{ width: size, height: size, color: parsed.color || 'currentColor' }} />; }
  if (parsed.type === 'url') return <img src={parsed.value} alt="" className={`flex-shrink-0 object-contain rounded ${className}`} style={{ width: size, height: size }} />;
  return null;
}
