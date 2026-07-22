/** Registry for NPC templates, character sprites, and dialogue profiles */

export interface NPCTemplate {
  id: string;
  name: string;
  spriteId: string;
  shirtColor: string;
  pantsColor: string;
  hairColor: string;
  skinTone: string;
  dialogueSpeaker: string;
  isShopkeeper?: boolean;
  isHealer?: boolean;
}

export class NPCRegistry {
  private static templates = new Map<string, NPCTemplate>([
    ['nurse_joy', {
      id: 'nurse_joy',
      name: 'Nurse Joy',
      spriteId: 'nurse_joy',
      shirtColor: '#ffffff',
      pantsColor: '#ff69b4',
      hairColor: '#ff69b4',
      skinTone: '#ffccaa',
      dialogueSpeaker: 'Nurse Joy',
      isHealer: true,
    }],
    ['clerk', {
      id: 'clerk',
      name: 'Mart Clerk',
      spriteId: 'clerk',
      shirtColor: '#ffd700',
      pantsColor: '#222222',
      hairColor: '#555555',
      skinTone: '#ffccaa',
      dialogueSpeaker: 'Clerk',
      isShopkeeper: true,
    }],
    ['clerk_blue', {
      id: 'clerk_blue',
      name: 'Station Master',
      spriteId: 'clerk_blue',
      shirtColor: '#4169e1',
      pantsColor: '#1e381d',
      hairColor: '#222222',
      skinTone: '#e5a073',
      dialogueSpeaker: 'Officer',
    }],
    ['clerk_route', {
      id: 'clerk_route',
      name: 'Route Guide',
      spriteId: 'clerk_route',
      shirtColor: '#ffa500',
      pantsColor: '#222222',
      hairColor: '#8b4513',
      skinTone: '#ffccaa',
      dialogueSpeaker: 'Ranger',
    }],
    ['craftsman', {
      id: 'craftsman',
      name: 'Craftsman Bob',
      spriteId: 'craftsman',
      shirtColor: '#8b4513',
      pantsColor: '#3a8be8',
      hairColor: '#000000',
      skinTone: '#8d5524',
      dialogueSpeaker: 'Bob',
    }],
    ['guide', {
      id: 'guide',
      name: 'Town Elder',
      spriteId: 'guide',
      shirtColor: '#32cd32',
      pantsColor: '#3b2313',
      hairColor: '#ffffff',
      skinTone: '#f1c27d',
      dialogueSpeaker: 'Elder',
    }],
    ['professor', {
      id: 'professor',
      name: 'Prof. Pine',
      spriteId: 'professor',
      shirtColor: '#ffffff',
      pantsColor: '#8b4513',
      hairColor: '#bdc3c7',
      skinTone: '#ffccaa',
      dialogueSpeaker: 'Prof. Pine',
    }],
    ['stylist', {
      id: 'stylist',
      name: 'Stylist Stylia',
      spriteId: 'stylist',
      shirtColor: '#e84393',
      pantsColor: '#8e44ad',
      hairColor: '#fd79a8',
      skinTone: '#ffccaa',
      dialogueSpeaker: 'Stylia',
    }],
    ['mayor', {
      id: 'mayor',
      name: 'City Mayor',
      spriteId: 'mayor',
      shirtColor: '#2c3e50',
      pantsColor: '#34495e',
      hairColor: '#bdc3c7',
      skinTone: '#e5a073',
      dialogueSpeaker: 'Mayor',
    }],
    ['librarian', {
      id: 'librarian',
      name: 'Head Librarian',
      spriteId: 'librarian',
      shirtColor: '#8b4513',
      pantsColor: '#5c3a21',
      hairColor: '#555555',
      skinTone: '#f1c27d',
      dialogueSpeaker: 'Librarian',
    }],
    ['gardener', {
      id: 'gardener',
      name: 'Berry Gardener',
      spriteId: 'gardener',
      shirtColor: '#27ae60',
      pantsColor: '#2ecc71',
      hairColor: '#f1c40f',
      skinTone: '#ffccaa',
      dialogueSpeaker: 'Gardener',
    }],
    ['collector', {
      id: 'collector',
      name: 'Monster Collector',
      spriteId: 'collector',
      shirtColor: '#9b59b6',
      pantsColor: '#34495e',
      hairColor: '#e74c3c',
      skinTone: '#e5a073',
      dialogueSpeaker: 'Collector',
    }],
  ]);

  static get(id: string): NPCTemplate {
    return this.templates.get(id) || {
      id,
      name: id,
      spriteId: 'guide',
      shirtColor: '#dddddd',
      pantsColor: '#333333',
      hairColor: '#555555',
      skinTone: '#ffccaa',
      dialogueSpeaker: 'NPC',
    };
  }

  static register(template: NPCTemplate): void {
    this.templates.set(template.id, template);
  }
}
