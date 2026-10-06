async function checkTaxa() {
  const taxa = ['Reptilia', 'Squamata', 'Testudines', 'Crocodylia', 'Serpentes'];
  for (const t of taxa) {
    const res = await (await fetch(`https://api.gbif.org/v1/species/match?name=${t}`)).json();
    console.log(t, '-> taxonKey:', res.usageKey, 'rank:', res.rank, 'class:', res.class, 'order:', res.order);
  }
}
checkTaxa();
