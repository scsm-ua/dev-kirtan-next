/**/
export const CREATOR = 'Sri Chaitanya Saraswat Math Worldwide';
export const KEYWORDS = ['Kirtan', 'Kirtan Guide', 'Sri Chaitanya Saraswat Math', 'Gaudiya gitanjali', 'Vaishnava songbook', 'devotional songs', 'bhajans'];
export const PUBLISHER = 'Sri Chaitanya Saraswat Math Worldwide';

export const AUTHORS = [
  { name: 'Srila Bhaktivinod Thakur' },
  { name: 'Srila Narottam Das Thakur' },
  { name: 'Srila Rupa Goswami' },
  { name: 'Srila Lochan Das Thakur' },
  { name: 'Srila Vrindavan Das Thakur' },
  { name: 'Srila Krishnadas Kaviraj Goswami' },
  { name: 'Srila Bhakti Siddhanta Saraswati Thakur' },
  { name: 'Srila B.R. Sridhar Dev-Goswami Maharaj' },
  { name: 'Srila B.S. Govinda Dev-Goswami Maharaj' },
];

export const ROBOTS = {
  index: process.env.NEXT_PUBLIC_ENV === 'production',
  follow: process.env.NEXT_PUBLIC_ENV === 'production',
  nocache: false,
  googleBot: {
    index: process.env.NEXT_PUBLIC_ENV === 'production',
    follow: process.env.NEXT_PUBLIC_ENV === 'production',
    noimageindex: false,
    'max-image-preview': 'large',
    'max-snippet': -1
  }
};
