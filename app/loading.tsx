import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div className={styles.page} aria-label="Loading">
      <div className={styles.hero}>
        <span className={styles.lineShort} />
        <span className={styles.lineTitle} />
        <span className={styles.lineBody} />
      </div>
      <div className={styles.grid}>
        {[0, 1, 2].map((index) => (
          <div className={styles.card} key={index}>
            <span className={styles.icon} />
            <div><span className={styles.lineMedium} /><span className={styles.lineSmall} /></div>
          </div>
        ))}
      </div>
      <div className={styles.panel}>
        {[0, 1, 2, 3, 4].map((index) => <span className={styles.row} key={index} />)}
      </div>
    </div>
  );
}
