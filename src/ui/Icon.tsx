import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color as palette } from './tokens';

export type IconName =
  | 'back'
  | 'forward'
  | 'close'
  | 'settings'
  | 'plus'
  | 'check'
  | 'share'
  | 'trash'
  | 'edit'
  | 'copy'
  | 'up'
  | 'down'
  | 'play'
  | 'decks'
  | 'camera'
  | 'link'
  | 'file'
  | 'paste'
  | 'search'
  | 'trophy'
  | 'user'
  | 'users'
  | 'timer'
  | 'flag'
  | 'phone'
  | 'sun'
  | 'reset'
  | 'help'
  | 'home'
  | 'download'
  | 'pass'
  | 'flame'
  | 'shuffle'
  | 'bolt'
  | 'eye'
  | 'eyeOff'
  | 'heart'
  | 'heartFilled'
  | 'sort'
  | 'sound'
  | 'infinity';

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** Stroke weight, in the 24-unit grid. Heavy by default to match the type. */
  weight?: number;
};

/**
 * The icon set.
 *
 * Drawn here rather than pulled from an icon font: a few dozen shapes, all on
 * one 24-unit grid with round caps and a heavy stroke so they sit with the
 * rounded type instead of looking borrowed from another app.
 */
export function Icon({ name, size = 24, color = palette.text, weight = 2.75 }: IconProps) {
  const stroke = {
    stroke: color,
    strokeWidth: weight,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      {shape(name, stroke, color)}
    </Svg>
  );
}

type Stroke = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: string;
};

function shape(name: IconName, s: Stroke, fill: string) {
  switch (name) {
    case 'back':
      return <Path d="M15 5 L8 12 L15 19" {...s} />;
    case 'forward':
      return <Path d="M9 5 L16 12 L9 19" {...s} />;
    case 'close':
      return <Path d="M6 6 L18 18 M18 6 L6 18" {...s} />;
    case 'settings':
      return (
        <>
          <Path d="M4 7 H20 M4 17 H20" {...s} />
          <Circle cx={9} cy={7} r={2.6} fill={fill} stroke={fill} strokeWidth={1.5} />
          <Circle cx={15} cy={17} r={2.6} fill={fill} stroke={fill} strokeWidth={1.5} />
        </>
      );
    case 'plus':
      return <Path d="M12 5 V19 M5 12 H19" {...s} />;
    case 'check':
      return <Path d="M5 12.5 L10 17.5 L19 7" {...s} />;
    case 'pass':
      return <Path d="M5 15 A7 7 0 0 1 18 9 M18 4 V9 H13" {...s} />;
    case 'share':
      return (
        <Path
          d="M12 3 V14 M7.5 7.5 L12 3 L16.5 7.5 M5 12 V18 A2 2 0 0 0 7 20 H17 A2 2 0 0 0 19 18 V12"
          {...s}
        />
      );
    case 'download':
      return (
        <Path
          d="M12 3 V14 M7.5 9.5 L12 14 L16.5 9.5 M5 14 V18 A2 2 0 0 0 7 20 H17 A2 2 0 0 0 19 18 V14"
          {...s}
        />
      );
    case 'trash':
      return <Path d="M4 7 H20 M9.5 7 V4.5 H14.5 V7 M6.5 7 L7.5 20 H16.5 L17.5 7" {...s} />;
    case 'edit':
      return <Path d="M5 19 L5.8 15.2 L16 5 L19 8 L8.8 18.2 Z M13.5 7.5 L16.5 10.5" {...s} />;
    case 'copy':
      return (
        <>
          <Rect x={9} y={9} width={11} height={11} rx={2.5} {...s} />
          <Path d="M15 9 V6.5 A2.5 2.5 0 0 0 12.5 4 H6.5 A2.5 2.5 0 0 0 4 6.5 V12.5 A2.5 2.5 0 0 0 6.5 15 H9" {...s} />
        </>
      );
    case 'up':
      return <Path d="M6 15 L12 9 L18 15" {...s} />;
    case 'down':
      return <Path d="M6 9 L12 15 L18 9" {...s} />;
    case 'play':
      return <Path d="M8 5 L19 12 L8 19 Z" {...s} fill={fill} />;
    case 'decks':
      return (
        <>
          <Rect x={4} y={7} width={12} height={14} rx={2.5} {...s} />
          <Path d="M8 3.5 H17.5 A2.5 2.5 0 0 1 20 6 V16.5" {...s} />
        </>
      );
    case 'camera':
      return (
        <>
          <Path d="M3.5 8.5 A1.5 1.5 0 0 1 5 7 H7.5 L9 4.5 H15 L16.5 7 H19 A1.5 1.5 0 0 1 20.5 8.5 V18 A1.5 1.5 0 0 1 19 19.5 H5 A1.5 1.5 0 0 1 3.5 18 Z" {...s} />
          <Circle cx={12} cy={13} r={3.3} {...s} />
        </>
      );
    case 'link':
      return (
        <Path
          d="M10 14 L14 10 M10.5 6.5 L12 5 A4 4 0 0 1 19 12 L17.5 13.5 M13.5 17.5 L12 19 A4 4 0 0 1 5 12 L6.5 10.5"
          {...s}
        />
      );
    case 'file':
      return <Path d="M6 3 H14 L19 8 V21 H6 Z M14 3 V8 H19" {...s} />;
    case 'paste':
      return (
        <>
          <Rect x={5} y={5} width={14} height={16} rx={2.5} {...s} />
          <Path d="M9 5 V3.5 H15 V5 M9 11 H15 M9 15 H13" {...s} />
        </>
      );
    case 'search':
      return <Path d="M10.5 17 A6.5 6.5 0 1 1 10.5 4 A6.5 6.5 0 0 1 10.5 17 Z M15.5 15.5 L20 20" {...s} />;
    case 'trophy':
      return (
        <Path
          d="M8 4 H16 V9 A4 4 0 0 1 8 9 Z M8 6 H5 A3 3 0 0 0 8 10.5 M16 6 H19 A3 3 0 0 1 16 10.5 M12 13 V17 M8 20 H16 M9.5 17 H14.5"
          {...s}
        />
      );
    case 'user':
      return <Path d="M12 12 A4 4 0 1 1 12 4 A4 4 0 0 1 12 12 Z M5 20 A7 7 0 0 1 19 20" {...s} />;
    case 'users':
      return (
        <Path
          d="M9 11 A3.2 3.2 0 1 1 9 4.6 A3.2 3.2 0 0 1 9 11 Z M3 19.5 A6 6 0 0 1 15 19.5 M16 5 A3 3 0 0 1 16 11 M17.5 14 A5 5 0 0 1 21 19.5"
          {...s}
        />
      );
    case 'timer':
      return <Path d="M12 21 A7.5 7.5 0 1 1 12 6 A7.5 7.5 0 0 1 12 21 Z M12 13.5 V10 M10 3 H14" {...s} />;
    case 'flag':
      return <Path d="M5 21 V4 M5 4 H17 L14.5 8.5 L17 13 H5" {...s} />;
    case 'phone':
      return (
        <>
          <Rect x={6.5} y={3} width={11} height={18} rx={2.5} {...s} />
          <Path d="M11 17.5 H13" {...s} />
        </>
      );
    case 'sun':
      return (
        <>
          <Circle cx={12} cy={12} r={4} {...s} />
          <Path
            d="M12 2.5 V4.5 M12 19.5 V21.5 M2.5 12 H4.5 M19.5 12 H21.5 M5.3 5.3 L6.7 6.7 M17.3 17.3 L18.7 18.7 M5.3 18.7 L6.7 17.3 M17.3 6.7 L18.7 5.3"
            {...s}
          />
        </>
      );
    case 'reset':
      return <Path d="M19.5 12 A7.5 7.5 0 1 1 17.3 6.7 M19.5 3.5 V7.5 H15.5" {...s} />;
    case 'help':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Path d="M9.6 9.4 A2.5 2.5 0 1 1 13.4 11.6 C12.6 12.1 12 12.6 12 13.6 M12 17 V17.1" {...s} />
        </>
      );
    case 'flame':
      return (
        <Path
          d="M12 21 C8 21 5.5 18.4 5.5 15 C5.5 11.5 8 9.5 9.5 7 C10 9 11 10 12 10.5 C12 7.5 13.5 4.5 16 3 C15.5 6 18.5 9 18.5 14.5 C18.5 18.4 16 21 12 21 Z"
          {...s}
        />
      );
    case 'shuffle':
      return <Path d="M4 7 H7 C11 7 13 17 17 17 H20 M4 17 H7 C9 17 10.2 14.5 11 12.5 M13 11.5 C13.8 9.5 15 7 17 7 H20 M17 4 L20 7 L17 10 M17 14 L20 17 L17 20" {...s} />;
    case 'bolt':
      return <Path d="M13 3 L5 13.5 H11.5 L10.5 21 L19 10 H12.5 Z" {...s} />;
    case 'home':
      return <Path d="M4 11 L12 4 L20 11 V20 H14.5 V14.5 H9.5 V20 H4 Z" {...s} />;
    case 'eye':
      return (
        <>
          <Path d="M2.5 12 C5 7 8.5 5 12 5 C15.5 5 19 7 21.5 12 C19 17 15.5 19 12 19 C8.5 19 5 17 2.5 12 Z" {...s} />
          <Circle cx={12} cy={12} r={3} {...s} />
        </>
      );
    case 'eyeOff':
      return (
        <Path
          d="M4 4 L20 20 M9.5 5.5 C10.3 5.2 11.1 5 12 5 C15.5 5 19 7 21.5 12 C20.8 13.4 20 14.6 19 15.6 M15.5 17.9 C14.4 18.6 13.2 19 12 19 C8.5 19 5 17 2.5 12 C3.6 9.8 5 8.2 6.5 7.1"
          {...s}
        />
      );
    case 'heart':
      return <Path d="M12 20 C6 15.5 3 12.5 3 8.8 C3 6.2 5 4.3 7.4 4.3 C9.3 4.3 10.9 5.4 12 7 C13.1 5.4 14.7 4.3 16.6 4.3 C19 4.3 21 6.2 21 8.8 C21 12.5 18 15.5 12 20 Z" {...s} />;
    case 'heartFilled':
      return <Path d="M12 20 C6 15.5 3 12.5 3 8.8 C3 6.2 5 4.3 7.4 4.3 C9.3 4.3 10.9 5.4 12 7 C13.1 5.4 14.7 4.3 16.6 4.3 C19 4.3 21 6.2 21 8.8 C21 12.5 18 15.5 12 20 Z" {...s} fill={fill} />;
    case 'sort':
      return <Path d="M7 4 V20 M3.5 16.5 L7 20 L10.5 16.5 M17 20 V4 M13.5 7.5 L17 4 L20.5 7.5" {...s} />;
    case 'sound':
      return <Path d="M4 9.5 H7.5 L12 5.5 V18.5 L7.5 14.5 H4 Z M15.5 9 C16.5 10 16.5 14 15.5 15 M18.5 6.5 C21 9 21 15 18.5 17.5" {...s} />;
    case 'infinity':
      return <Path d="M12 12 C10 9 8.5 8 6.8 8 C4.6 8 3 9.8 3 12 C3 14.2 4.6 16 6.8 16 C8.5 16 10 15 12 12 C14 9 15.5 8 17.2 8 C19.4 8 21 9.8 21 12 C21 14.2 19.4 16 17.2 16 C15.5 16 14 15 12 12 Z" {...s} />;
  }
}
