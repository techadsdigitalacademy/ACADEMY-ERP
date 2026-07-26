const fs = require('fs');
let dash = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

dash = dash.replace(
  /      <\/main>\r?\n    <\/div>\r?\n  \);\r?\n};/g,
  `      </main>
      </div>
    </div>
  );
};`
);

fs.writeFileSync('src/pages/SalesDashboard.tsx', dash, 'utf8');
console.log('Fixed EOF divs');
