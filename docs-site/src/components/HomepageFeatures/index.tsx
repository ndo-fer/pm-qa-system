import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Task Management & Kanban Board',
    icon: '📋',
    description: (
      <>
        Kelola backlog pengembangan dengan Kanban Board multi-developer. Setiap tugas dilengkapi
        metadata traceability penuh — Epic, Kode FR, Referensi SRD, Kriteria Penerimaan, dan
        fase target pengembangan.
      </>
    ),
  },
  {
    title: 'S-Curve & Progress Tracking',
    icon: '📈',
    description: (
      <>
        Visualisasikan kemajuan proyek secara real-time dengan grafik S-Curve dinamis berbasis
        bobot milestone. Tampilan mingguan, bulanan, dan keseluruhan tersedia untuk PM dan
        stakeholder manajemen.
      </>
    ),
  },
  {
    title: 'QA Matrix Testing & Otomasi',
    icon: '🧪',
    description: (
      <>
        Eksekusi pengujian berbasis peran (Administrator, Top User, User) sekaligus dalam satu
        sesi. Defect ticket dibuat otomatis di Kanban Board saat test gagal, dengan notifikasi
        real-time via WhatsApp Bot Gateway.
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center" style={{fontSize: '4rem', lineHeight: 1.2, marginBottom: '1rem'}}>
        {icon}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
