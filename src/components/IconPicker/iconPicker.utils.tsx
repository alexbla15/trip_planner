import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  // Food & Drink
  Utensils, UtensilsCrossed, Wine, Coffee, Beer, Croissant, IceCream2, Pizza,
  Sandwich, Soup, Salad, Cake, Cookie, CupSoda, Milk, Apple, Cherry,
  Citrus, Grape, Fish, Egg, Carrot, Wheat, Amphora,

  // Shopping & Commerce
  ShoppingCart, ShoppingBag, Store, Package, Tag, Tags, Receipt, Wallet,
  CreditCard, Gift, Gem, BadgePercent, Barcode, ShoppingBasket,

  // Culture & Art
  Landmark, Castle, LibraryBig, BookOpen, BookMarked, ScrollText, Feather,
  Palette, PaintbrushVertical, Brush, ImageIcon, Aperture, Film, Image, Video,
  Clapperboard, Theater, Ticket, Drama, Mic, Mic2, Music, Music2, Music4,
  Headphones, Radio, Disc3, Guitar, Piano,

  // Religion & Heritage
  Church, Cross, Star, Sword,

  // Nature & Outdoors
  TreePine, TreeDeciduous, Leaf, Flower2, Flower, Sprout,
  Mountain, MountainSnow, Waves, Umbrella, Sailboat, Shell, Footprints, Tent,
  Compass, Map, MapPin, MapPinned, Binoculars, Telescope, Sun, Sunset, Sunrise, Moon,
  CloudSun, Snowflake, Flame, Droplets, Droplet, Wind, CloudRain, Rainbow,
  Palmtree,

  // Sports & Fitness
  Dumbbell, Bike, PersonStanding, Swords, Trophy, Medal, Target, Volleyball,
  Zap, Activity, Stethoscope, Axe,

  // Entertainment & Leisure
  FerrisWheel, Dices, Gamepad2, Joystick, PartyPopper, Sparkles, Wand2,
  Heart, Smile, Laugh, Puzzle,

  // Transport
  Plane, PlaneLanding, PlaneTakeoff, TrainFront, Train, Car, Truck,
  Ship, BusFront, CarFront, Cable, Anchor, Fuel,
  Navigation, Navigation2, Route, LocateFixed, Crosshair,

  // Accommodation
  Hotel, BedDouble, Home, Building, Building2, KeyRound, DoorOpen,
  Sofa, Lamp, Bath,

  // Travel & Luggage
  Luggage, Archive, Backpack, Briefcase, Globe, Globe2, Camera, ScanLine,

  // People & Social
  Users, User, UserRound, UserCheck, Baby, Dog, Cat,
  Handshake, UsersRound, ThumbsUp,

  // Infrastructure
  Warehouse, Factory, School2, Hospital,

  // Fallback
  Circle,
} from "lucide-react";

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  // ── Food & Drink ──────────────────────────────────────────────────────────
  Utensils,
  UtensilsCrossed,
  Wine,
  Coffee,
  Beer,
  Croissant,
  IceCream2,
  Pizza,
  Sandwich,
  Soup,
  Salad,
  Cake,
  Cookie,
  CupSoda,
  Milk,
  Apple,
  Cherry,
  Citrus,
  Grape,
  Fish,
  Egg,
  Carrot,
  Wheat,
  Amphora,

  // ── Shopping & Commerce ───────────────────────────────────────────────────
  ShoppingCart,
  ShoppingBag,
  ShoppingBasket,
  Store,
  Package,
  Tag,
  Tags,
  Receipt,
  Wallet,
  CreditCard,
  Gift,
  Gem,
  BadgePercent,
  Barcode,

  // ── Culture & Art ─────────────────────────────────────────────────────────
  Landmark,
  Castle,
  LibraryBig,
  BookOpen,
  BookMarked,
  ScrollText,
  Feather,
  Palette,
  PaintbrushVertical,
  Brush,
  ImageIcon,
  Image,
  Video,
  Aperture,
  Film,
  Clapperboard,
  Theater,
  Ticket,
  Drama,
  Mic,
  Mic2,
  Music,
  Music2,
  Music4,
  Headphones,
  Radio,
  Disc3,
  Guitar,
  Piano,

  // ── Religion & Heritage ───────────────────────────────────────────────────
  Church,
  Cross,
  Star,
  Sword,

  // ── Nature & Outdoors ─────────────────────────────────────────────────────
  TreePine,
  TreeDeciduous,
  Leaf,
  Flower2,
  Flower,
  Sprout,
  Mountain,
  MountainSnow,
  Waves,
  Umbrella,
  Sailboat,
  Shell,
  Footprints,
  Tent,
  Compass,
  Map,
  MapPin,
  MapPinned,
  Binoculars,
  Telescope,
  Sun,
  Sunset,
  Sunrise,
  Moon,
  CloudSun,
  Snowflake,
  Flame,
  Droplets,
  Droplet,
  Wind,
  CloudRain,
  Rainbow,
  Palmtree,

  // ── Sports & Fitness ──────────────────────────────────────────────────────
  Dumbbell,
  Bike,
  PersonStanding,
  Swords,
  Trophy,
  Medal,
  Target,
  Volleyball,
  Zap,
  Activity,
  Stethoscope,
  Axe,

  // ── Entertainment & Leisure ───────────────────────────────────────────────
  FerrisWheel,
  Dices,
  Gamepad2,
  Joystick,
  PartyPopper,
  Sparkles,
  Wand2,
  Heart,
  Smile,
  Laugh,
  Puzzle,

  // ── Transport ─────────────────────────────────────────────────────────────
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  TrainFront,
  Train,
  Car,
  Truck,
  Ship,
  BusFront,
  CarFront,
  Cable,
  Anchor,
  Fuel,
  Navigation,
  Navigation2,
  Route,
  LocateFixed,
  Crosshair,

  // ── Accommodation ─────────────────────────────────────────────────────────
  Hotel,
  BedDouble,
  Home,
  Building,
  Building2,
  KeyRound,
  DoorOpen,
  Sofa,
  Lamp,
  Bath,

  // ── Travel & Luggage ──────────────────────────────────────────────────────
  Luggage,
  Archive,
  Backpack,
  Briefcase,
  Globe,
  Globe2,
  Camera,
  ScanLine,

  // ── People & Social ───────────────────────────────────────────────────────
  Users,
  User,
  UserRound,
  UserCheck,
  Baby,
  Dog,
  Cat,
  Handshake,
  UsersRound,
  ThumbsUp,

  // ── Infrastructure ────────────────────────────────────────────────────────
  Warehouse,
  Factory,
  School2,
  Hospital,
};

export const ICON_NAMES: string[] = Object.keys(ICON_REGISTRY).sort();

export function getIconComponent(name: string): LucideIcon {
  return ICON_REGISTRY[name] ?? Circle;
}

export function renderTypeIcon(iconName: string, size = 13): React.ReactNode {
  const Icon = getIconComponent(iconName);
  return <Icon size={size} aria-hidden="true" />;
}
