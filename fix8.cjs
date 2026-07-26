const fs = require('fs');
let dash = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

dash = dash.replace(
  /      <\/main>\r?\n      <\/div>\r?\n    <\/div>\r?\n  \);\r?\n};/g,
  `    </div>
  );
};`
);
dash = dash.replace(
  /      <\/main>\n      <\/div>\n    <\/div>\n  \);\n};/g,
  `    </div>
  );
};`
);

fs.writeFileSync('src/pages/SalesDashboard.tsx', dash, 'utf8');

let text = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');
let open = (text.match(/<div\b/g) || []).length;
let close = (text.match(/<\/div>/g) || []).length;
console.log('div', open, close);

let mOpen = (text.match(/<main\b/g) || []).length;
let mClose = (text.match(/<\/main>/g) || []).length;
console.log('main', mOpen, mClose);
