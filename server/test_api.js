async function test() {
  try {
    const res = await fetch('http://localhost:14000/api/map/region', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: -193871.13806279,
        y: 583928.60103666,
        z: 487.35146762849
      })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();
